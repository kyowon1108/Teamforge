import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import {
  TopicSuggestionsSchema,
  SurveyAnswersSchema,
  type IdeaSubmitBody,
  type BuildOnBody,
  type IdeaReactBody,
  type TopicSuggestion,
} from '@teamforge/contracts';

// Phase transition map
const PHASE_ORDER = ['ideation', 'sharing', 'clustering', 'voting', 'confirmed'] as const;
type Phase = (typeof PHASE_ORDER)[number];

const MAX_IDEAS_PER_USER = 5;

@Injectable()
export class BrainstormService {
  private readonly openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async requireMembership(teamId: string, userId: string) {
    const membership = await this.prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership) {
      throw new NotFoundException({
        code: 'MEMBERSHIP_NOT_FOUND',
        message: '해당 팀의 멤버가 아닙니다',
      });
    }

    return membership;
  }

  private async requireSession(teamId: string) {
    const session = await this.prisma.brainstormSession.findUnique({
      where: { teamId },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: '브레인스토밍 세션이 없습니다',
      });
    }

    return session;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * GET /api/teams/:teamId/brainstorm
   * Upsert session + return phase-appropriate data
   */
  async getOrCreateSession(teamId: string, userId: string) {
    const membership = await this.requireMembership(teamId, userId);

    const session = await this.prisma.brainstormSession.upsert({
      where: { teamId },
      create: { teamId, startedAt: new Date() },
      update: {},
    });

    // Gather team capability summary from survey data
    const teamCapability = await this._buildTeamCapability(teamId);

    if (session.phase === 'ideation') {
      // Ideation phase: show only own ideas + aggregate counts
      const myIdeas = await this.prisma.brainstormIdea.findMany({
        where: { sessionId: session.id, userId },
        orderBy: { createdAt: 'asc' },
      });

      const submittedCount = await this.prisma.brainstormIdea.count({
        where: { sessionId: session.id },
      });

      const totalMembers = await this.prisma.teamMembership.count({
        where: { teamId, role: { not: 'observer' } },
      });

      return {
        session: {
          id: session.id,
          phase: session.phase,
          facilitationMode: session.facilitationMode,
          startedAt: session.startedAt,
        },
        ideas: { myIdeas, submittedCount, totalMembers },
        teamCapability,
      };
    }

    // sharing, clustering, voting, confirmed: show all ideas with reactions + build-on
    const allIdeas = await this._getAllIdeasWithRelations(session.id);

    // For clustering/voting, also include topic job status
    let topicJob = null;
    if (session.phase === 'clustering' || session.phase === 'voting' || session.phase === 'confirmed') {
      topicJob = await this.prisma.kickoffTopicJob.findUnique({
        where: { teamId },
        include: { topics: { include: { reactions: true } } },
      });
    }

    return {
      session: {
        id: session.id,
        phase: session.phase,
        facilitationMode: session.facilitationMode,
        startedAt: session.startedAt,
      },
      ideas: allIdeas,
      topicJob,
      teamCapability,
    };
  }

  /**
   * POST /api/teams/:teamId/brainstorm/ideas
   */
  async submitIdea(teamId: string, userId: string, body: IdeaSubmitBody) {
    const membership = await this.requireMembership(teamId, userId);

    if (membership.role === 'observer') {
      throw new ForbiddenException({
        code: 'OBSERVER_FORBIDDEN',
        message: '옵저버는 아이디어를 제출할 수 없습니다',
      });
    }

    const session = await this.requireSession(teamId);

    if (session.phase !== 'ideation' && session.phase !== 'sharing') {
      throw new ForbiddenException({
        code: 'PHASE_LOCKED',
        message: '현재 단계에서는 아이디어를 제출할 수 없습니다',
      });
    }

    const count = await this.prisma.brainstormIdea.count({
      where: { sessionId: session.id, userId },
    });

    if (count >= MAX_IDEAS_PER_USER) {
      throw new BadRequestException({
        code: 'IDEA_LIMIT_REACHED',
        message: `아이디어는 최대 ${MAX_IDEAS_PER_USER}개까지 제출할 수 있습니다`,
      });
    }

    const idea = await this.prisma.brainstormIdea.create({
      data: {
        sessionId: session.id,
        userId,
        title: body.title,
        description: body.description,
        type: 'original',
      },
    });

    return idea;
  }

  /**
   * POST /api/teams/:teamId/brainstorm/ideas/:ideaId/build-on
   */
  async buildOnIdea(teamId: string, userId: string, parentIdeaId: string, body: BuildOnBody) {
    const membership = await this.requireMembership(teamId, userId);

    if (membership.role === 'observer') {
      throw new ForbiddenException({
        code: 'OBSERVER_FORBIDDEN',
        message: '옵저버는 아이디어에 빌드온할 수 없습니다',
      });
    }

    const session = await this.requireSession(teamId);

    if (session.phase !== 'sharing') {
      throw new ForbiddenException({
        code: 'PHASE_LOCKED',
        message: 'sharing 단계에서만 빌드온이 가능합니다',
      });
    }

    // Verify parent idea exists and belongs to this session
    const parentIdea = await this.prisma.brainstormIdea.findUnique({
      where: { id: parentIdeaId },
    });

    if (!parentIdea || parentIdea.sessionId !== session.id) {
      throw new NotFoundException({
        code: 'IDEA_NOT_FOUND',
        message: '원본 아이디어를 찾을 수 없습니다',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const newIdea = await tx.brainstormIdea.create({
        data: {
          sessionId: session.id,
          userId,
          title: body.title,
          description: body.description,
          type: 'build_on',
        },
      });

      await tx.ideaBuildOnEdge.create({
        data: {
          parentIdeaId,
          childIdeaId: newIdea.id,
          createdBy: userId,
        },
      });

      return newIdea;
    });

    return result;
  }

  /**
   * POST /api/teams/:teamId/brainstorm/ideas/:ideaId/react
   */
  async reactToIdea(teamId: string, userId: string, ideaId: string, body: IdeaReactBody) {
    const membership = await this.requireMembership(teamId, userId);

    if (membership.role === 'observer') {
      throw new ForbiddenException({
        code: 'OBSERVER_FORBIDDEN',
        message: '옵저버는 반응을 남길 수 없습니다',
      });
    }

    const session = await this.requireSession(teamId);

    if (session.phase !== 'sharing') {
      throw new ForbiddenException({
        code: 'PHASE_LOCKED',
        message: 'sharing 단계에서만 반응이 가능합니다',
      });
    }

    const idea = await this.prisma.brainstormIdea.findUnique({
      where: { id: ideaId },
    });

    if (!idea || idea.sessionId !== session.id) {
      throw new NotFoundException({
        code: 'IDEA_NOT_FOUND',
        message: '아이디어를 찾을 수 없습니다',
      });
    }

    // comment requires content
    if (body.type === 'comment' && (!body.content || body.content.trim().length === 0)) {
      throw new BadRequestException({
        code: 'COMMENT_CONTENT_REQUIRED',
        message: '코멘트에는 내용이 필요합니다',
      });
    }

    const reaction = await this.prisma.ideaReaction.upsert({
      where: {
        ideaId_userId_type: { ideaId, userId, type: body.type },
      },
      update: { content: body.content ?? null },
      create: {
        ideaId,
        userId,
        type: body.type,
        content: body.content ?? null,
      },
    });

    return reaction;
  }

  /**
   * POST /api/teams/:teamId/brainstorm/advance
   * Leader-only phase transition with optimistic locking
   */
  async advancePhase(teamId: string, userId: string) {
    const membership = await this.requireMembership(teamId, userId);

    if (membership.role !== 'leader') {
      throw new ForbiddenException({
        code: 'LEADER_ONLY',
        message: '팀장만 단계를 전환할 수 있습니다',
      });
    }

    const session = await this.requireSession(teamId);
    const currentPhase = session.phase as Phase;
    const currentIdx = PHASE_ORDER.indexOf(currentPhase);

    if (currentIdx === -1 || currentIdx >= PHASE_ORDER.length - 1) {
      throw new BadRequestException({
        code: 'CANNOT_ADVANCE',
        message: '더 이상 전환할 단계가 없습니다',
      });
    }

    // voting -> confirmed is handled by confirmTopic, not advancePhase
    if (currentPhase === 'voting') {
      throw new BadRequestException({
        code: 'USE_CONFIRM_TOPIC',
        message: 'voting에서 confirmed로의 전환은 주제 확정(confirmTopic)을 사용하세요',
      });
    }

    const nextPhase = PHASE_ORDER[currentIdx + 1];

    // Phase-specific preconditions
    if (currentPhase === 'ideation') {
      const ideaCount = await this.prisma.brainstormIdea.count({
        where: { sessionId: session.id },
      });
      if (ideaCount < 1) {
        throw new BadRequestException({
          code: 'NO_IDEAS',
          message: '최소 1개 이상의 아이디어가 필요합니다',
        });
      }
    }

    if (currentPhase === 'sharing') {
      const ideaCount = await this.prisma.brainstormIdea.count({
        where: { sessionId: session.id },
      });
      if (ideaCount < 3) {
        throw new BadRequestException({
          code: 'NOT_ENOUGH_IDEAS',
          message: '클러스터링을 위해 최소 3개 이상의 아이디어가 필요합니다',
        });
      }
    }

    // Optimistic locking: only update if phase hasn't changed
    const updated = await this.prisma.brainstormSession.updateMany({
      where: { id: session.id, phase: currentPhase },
      data: { phase: nextPhase },
    });

    if (updated.count === 0) {
      throw new ConflictException({
        code: 'PHASE_CONFLICT',
        message: '다른 사용자가 이미 단계를 전환했습니다. 새로고침하세요.',
      });
    }

    // sharing -> clustering: trigger AI clustering
    if (currentPhase === 'sharing' && nextPhase === 'clustering') {
      // Create or reuse KickoffTopicJob
      const existingJob = await this.prisma.kickoffTopicJob.findUnique({
        where: { teamId },
      });

      let jobId: string;
      if (!existingJob) {
        const newJob = await this.prisma.kickoffTopicJob.create({
          data: { teamId, status: 'pending' },
        });
        jobId = newJob.id;
      } else {
        // Reset existing job for re-clustering
        await this.prisma.kickoffTopicJob.update({
          where: { id: existingJob.id },
          data: { status: 'pending', errorMsg: null },
        });
        jobId = existingJob.id;
      }

      // Fire-and-forget async clustering
      void this._clusterIdeasAsync(session.id, teamId, jobId);
    }

    return { phase: nextPhase };
  }

  /**
   * GET /api/teams/:teamId/brainstorm/ideas
   * Lightweight polling endpoint
   */
  async getIdeas(teamId: string, userId: string) {
    const membership = await this.requireMembership(teamId, userId);
    const session = await this.requireSession(teamId);

    if (session.phase === 'ideation') {
      const myIdeas = await this.prisma.brainstormIdea.findMany({
        where: { sessionId: session.id, userId },
        orderBy: { createdAt: 'asc' },
      });

      const submittedCount = await this.prisma.brainstormIdea.count({
        where: { sessionId: session.id },
      });

      const totalMembers = await this.prisma.teamMembership.count({
        where: { teamId, role: { not: 'observer' } },
      });

      return { phase: session.phase, myIdeas, submittedCount, totalMembers };
    }

    // sharing+: return all ideas
    const allIdeas = await this._getAllIdeasWithRelations(session.id);
    return { phase: session.phase, ideas: allIdeas };
  }

  // ---------------------------------------------------------------------------
  // AI Clustering (async, fire-and-forget)
  // ---------------------------------------------------------------------------

  private async _clusterIdeasAsync(
    sessionId: string,
    teamId: string,
    jobId: string,
  ): Promise<void> {
    try {
      await this.prisma.kickoffTopicJob.update({
        where: { id: jobId },
        data: { status: 'processing' },
      });

      // Fetch all ideas with relations
      const ideas = await this.prisma.brainstormIdea.findMany({
        where: { sessionId },
        include: {
          buildOnAsChild: true,
          reactions: true,
          user: { select: { name: true } },
        },
      });

      // Fetch survey data for team context
      const responses = await this.prisma.surveyResponse.findMany({
        where: { teamId, submitted: true },
        select: { userId: true, answers: true },
      });

      const sanitizedAnswers = responses.map((r) => ({
        userId: r.userId,
        answers: r.answers,
      }));

      const escapeXml = (s: string): string =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      const teamProfileSummary = `<survey_data>${escapeXml(JSON.stringify(sanitizedAnswers))}</survey_data>`;

      // Build ideas summary with XML boundaries for prompt injection defense
      const ideasSummary = ideas.map((idea) => {
        const likeCount = idea.reactions.filter((r) => r.type === 'like').length;
        const buildOnFrom = idea.buildOnAsChild.length > 0
          ? idea.buildOnAsChild.map((e) => e.parentIdeaId).join(', ')
          : null;

        return `<idea id="${escapeXml(idea.id)}">
  <title>${escapeXml(idea.title)}</title>
  <description>${escapeXml(idea.description)}</description>
  <author>${escapeXml(idea.user.name ?? 'anonymous')}</author>
  <type>${escapeXml(idea.type)}</type>
  <like_count>${likeCount}</like_count>
  ${buildOnFrom ? `<build_on_from>${escapeXml(buildOnFrom)}</build_on_from>` : ''}
</idea>`;
      });

      const brainstormBlock = `<brainstorm_ideas>\n${ideasSummary.join('\n')}\n</brainstorm_ideas>`;

      // AI call with 3 retries
      let parsed: ReturnType<typeof TopicSuggestionsSchema.safeParse> | null = null;
      let sourceIdeaIdsMap: Record<string, string[]> = {};

      for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `당신은 개발팀 킥오프 코치입니다. 브레인스토밍에서 나온 아이디어들을 분석해 3~5개 프로젝트 주제로 클러스터링합니다.
반드시 JSON 형식으로만 응답하세요:
{
  "topics": [
    {
      "title": "주제 제목 (string)",
      "rationale": "이 주제를 제안하는 이유 (string, 300자 이내)",
      "tags": ["태그1", "태그2"],
      "sourceIdeaIds": ["idea_id_1", "idea_id_2"]
    }
  ]
}
각 주제의 sourceIdeaIds에는 해당 주제에 포함된 원본 아이디어의 id를 반드시 포함하세요.`,
            },
            {
              role: 'user',
              content: `팀 설문 결과:\n${teamProfileSummary}\n\n브레인스토밍 아이디어 목록:\n${brainstormBlock}\n\n위 아이디어들을 팀의 기술 스택과 경험을 고려해 3~5개 주제로 클러스터링하세요. 각 주제에 포함된 원본 아이디어 ID를 sourceIdeaIds로 반환하세요.`,
            },
          ],
        });

        const raw = response.choices[0]?.message?.content ?? '';

        let jsonObj: unknown;
        try {
          jsonObj = JSON.parse(raw);
        } catch {
          if (attempt === 3) {
            throw new Error(`AI 응답 JSON 파싱 실패: ${raw.slice(0, 200)}`);
          }
          continue;
        }

        // Extract sourceIdeaIds before schema validation (schema doesn't include them)
        if (
          typeof jsonObj === 'object' &&
          jsonObj !== null &&
          Array.isArray((jsonObj as Record<string, unknown>).topics)
        ) {
          const topics = (jsonObj as Record<string, unknown>).topics as Array<Record<string, unknown>>;
          const tempMap: Record<number, string[]> = {};
          for (let i = 0; i < topics.length; i++) {
            const t = topics[i] as Record<string, unknown> | undefined;
            if (t && Array.isArray(t.sourceIdeaIds)) {
              tempMap[i] = (t.sourceIdeaIds as unknown[]).filter(
                (id: unknown): id is string => typeof id === 'string',
              );
            }
          }
          sourceIdeaIdsMap = {};
          for (const [idx, ids] of Object.entries(tempMap)) {
            sourceIdeaIdsMap[idx] = ids;
          }
        }

        parsed = TopicSuggestionsSchema.safeParse(jsonObj);
        if (parsed.success) break;

        if (attempt === 3) {
          throw new Error(
            `AI 응답 스키마 검증 실패: ${JSON.stringify(parsed.error.flatten())}`,
          );
        }
      }

      if (!parsed || !parsed.success) {
        throw new Error('AI 클러스터링 실패 (재시도 초과)');
      }

      // Delete old topics for this job if re-clustering
      await this.prisma.kickoffTopic.deleteMany({
        where: { jobId },
      });

      // Save clustered topics with sourceIdeaIds
      await this.prisma.kickoffTopic.createMany({
        data: parsed.data.topics.map((t: TopicSuggestion, idx: number) => ({
          teamId,
          jobId,
          title: t.title,
          rationale: t.rationale,
          tags: t.tags,
          sourceIdeaIds: sourceIdeaIdsMap[String(idx)] ?? [],
        })),
      });

      // Mark job completed
      await this.prisma.kickoffTopicJob.update({
        where: { id: jobId },
        data: { status: 'completed' },
      });

      // Auto-transition to voting
      await this.prisma.brainstormSession.updateMany({
        where: { id: sessionId, phase: 'clustering' },
        data: { phase: 'voting' },
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다';
      await this.prisma.kickoffTopicJob.update({
        where: { id: jobId },
        data: { status: 'failed', errorMsg },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async _getAllIdeasWithRelations(sessionId: string) {
    return this.prisma.brainstormIdea.findMany({
      where: { sessionId },
      include: {
        reactions: true,
        buildOnAsParent: {
          include: { childIdea: { select: { id: true, title: true, description: true, userId: true } } },
        },
        buildOnAsChild: {
          include: { parentIdea: { select: { id: true, title: true } } },
        },
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async _buildTeamCapability(teamId: string) {
    const responses = await this.prisma.surveyResponse.findMany({
      where: { teamId, submitted: true },
      select: { answers: true },
    });

    if (responses.length === 0) return null;

    const techStacks = new Set<string>();
    const strengths: Record<string, number> = {};

    for (const r of responses) {
      const parsed = SurveyAnswersSchema.safeParse(r.answers);
      if (!parsed.success) continue;
      const data = parsed.data;

      for (const tech of data.techStackList ?? []) {
        techStacks.add(tech);
      }

      const archetype = data.workArchetype;
      if (archetype) {
        strengths[archetype] = (strengths[archetype] ?? 0) + 1;
      }
    }

    // Sort strengths by count descending, take top 3
    const topStrengths = Object.entries(strengths)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return {
      techStackList: Array.from(techStacks),
      topStrengths,
      memberCount: responses.length,
    };
  }
}
