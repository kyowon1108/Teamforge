import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { TopicSuggestionsSchema, type TopicSuggestion, SurveyAnswersSchema, type SurveyAnswers } from '@teamforge/contracts';

@Injectable()
export class KickoffService implements OnApplicationBootstrap {
  private readonly openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Lifecycle hook — orphan job 복구
  // ---------------------------------------------------------------------------

  async onApplicationBootstrap() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await this.prisma.kickoffTopicJob.updateMany({
      where: { status: 'processing', updatedAt: { lt: fiveMinutesAgo } },
      data: { status: 'failed', errorMsg: 'Job timed out (orphan recovery)' },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * TeamMembership 존재 여부 확인 — 없으면 NotFoundException
   */
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

  /**
   * AI 주제 생성 — 백그라운드 실행 (void, await 없이 호출)
   */
  private async _generateTopicsAsync(
    jobId: string,
    teamId: string,
  ): Promise<void> {
    try {
      await this.prisma.kickoffTopicJob.update({
        where: { id: jobId },
        data: { status: 'processing' },
      });

      // 설문 응답 조회
      const responses = await this.prisma.surveyResponse.findMany({
        where: { teamId, submitted: true },
        select: { userId: true, answers: true },
      });

      const n = responses.length;

      // 사용자 입력을 프롬프트에 직접 삽입하지 않고 XML 태그로 경계 분리
      // answers는 Prisma Json 타입이므로 object로 반환됨 — sanitize 후 직렬화
      const sanitizedAnswers = responses.map((r) => ({
        userId: r.userId,
        answers: r.answers,
      }));

      const teamProfileSummary = `<survey_data>${JSON.stringify(sanitizedAnswers)}</survey_data>`;

      // OpenAI GPT-4o 호출 (최대 3회 재시도)
      let parsed: ReturnType<typeof TopicSuggestionsSchema.safeParse> | null =
        null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                '당신은 개발팀 킥오프 코치입니다. 팀 프로필을 분석해 적합한 프로젝트 주제 3~5개를 제안합니다.\n반드시 JSON 형식으로만 응답하세요: { "topics": [{"title": string, "rationale": string, "tags": string[]}] }',
            },
            {
              role: 'user',
              content: `팀 구성원 ${n}명의 설문 결과:\n${teamProfileSummary}\n각 주제는 팀의 기술 스택과 경험을 고려해야 합니다.`,
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

        parsed = TopicSuggestionsSchema.safeParse(jsonObj);
        if (parsed.success) break;

        if (attempt === 3) {
          throw new Error(
            `AI 응답 스키마 검증 실패: ${JSON.stringify(parsed.error.flatten())}`,
          );
        }
      }

      if (!parsed || !parsed.success) {
        throw new Error('AI 주제 생성 실패 (재시도 초과)');
      }

      // KickoffTopic 저장
      await this.prisma.kickoffTopic.createMany({
        data: parsed.data.topics.map((t: TopicSuggestion) => ({
          teamId,
          jobId,
          title: t.title,
          rationale: t.rationale,
          tags: t.tags,
        })),
      });

      await this.prisma.kickoffTopicJob.update({
        where: { id: jobId },
        data: { status: 'completed' },
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
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * GET /api/teams/:teamId/kickoff/status
   * Screen 6 — 팀 킥오프 현황 조회
   */
  async getKickoffStatus(teamId: string, userId: string) {
    await this.requireMembership(teamId, userId);

    const memberships = await this.prisma.teamMembership.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // 팀이 존재하지 않는 경우 (멤버십이 아예 없음)
    if (memberships.length === 0) {
      throw new NotFoundException({
        code: 'TEAM_NOT_FOUND',
        message: '팀을 찾을 수 없습니다',
      });
    }

    // 설문 응답 조회 (observer 제외 대상자들의 제출 여부 + answers)
    const surveyableUserIds = memberships
      .filter((m) => m.role !== 'observer')
      .map((m) => m.userId);

    const surveyResponses = await this.prisma.surveyResponse.findMany({
      where: {
        teamId,
        userId: { in: surveyableUserIds },
      },
      select: { userId: true, submitted: true, answers: true },
    });

    const submittedResponses = surveyResponses.filter((r) => r.submitted);
    const submittedSet = new Set(submittedResponses.map((r) => r.userId));

    const total = surveyableUserIds.length;
    const submitted = submittedSet.size;
    const canProceed = total > 0 && total === submitted;

    const phase: 'survey_in_progress' | 'survey_complete' = canProceed
      ? 'survey_complete'
      : 'survey_in_progress';

    const currentMembership = memberships.find((m) => m.userId === userId);
    const myRole = currentMembership?.role ?? 'member';

    const members = memberships.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      role: m.role,
      submitted: m.role === 'observer' ? null : submittedSet.has(m.userId),
      image: m.user.image,
    }));

    // 팀 인사이트 — survey_complete 시에만 계산
    let teamInsight: ReturnType<typeof this._buildTeamInsight> | null = null;
    if (canProceed && submittedResponses.length > 0) {
      teamInsight = this._buildTeamInsight(submittedResponses);
    }

    return {
      phase,
      surveyStats: { total, submitted, canProceed },
      members,
      myRole,
      teamInsight,
    };
  }

  private _buildTeamInsight(responses: { answers: unknown }[]) {
    const AXES = ['기획력', '기술력', '소통력', '추진력', '창의력', '성장력'] as const;
    type AxisKey = typeof AXES[number];

    const totals: Record<AxisKey, number> = {
      기획력: 0, 기술력: 0, 소통력: 0, 추진력: 0, 창의력: 0, 성장력: 0,
    };
    const roleCounts: Record<string, number> = {};
    let validCount = 0;

    for (const r of responses) {
      const parsed = SurveyAnswersSchema.safeParse(r.answers);
      if (!parsed.success) continue;
      const scores = this._calcAxisScores(parsed.data);
      for (const axis of AXES) totals[axis] += scores[axis];
      const role = parsed.data.workArchetype;
      if (role) roleCounts[role] = (roleCounts[role] ?? 0) + 1;
      validCount++;
    }

    if (validCount === 0) return null;

    const avgAxisScores = Object.fromEntries(
      AXES.map((a) => [a, Math.round(totals[a] / validCount)]),
    ) as Record<AxisKey, number>;

    const sorted = (Object.entries(avgAxisScores) as [AxisKey, number][]).sort((a, b) => b[1] - a[1]);
    const topAxes = sorted.slice(0, 2).map(([name]) => name);
    const bottomAxis = sorted[sorted.length - 1]?.[0] ?? sorted[0]![0];

    return { avgAxisScores, topAxes, bottomAxis, roleDistribution: roleCounts };
  }

  private _calcAxisScores(answers: SurveyAnswers) {
    const backgroundBonusMap: Record<string, number> = { cs_major: 40, working_dev: 35, bootcamp: 25, non_major: 15, pm_designer: 20 };
    const backgroundBonus = answers.backgroundType ? (backgroundBonusMap[answers.backgroundType] ?? 0) : 0;
    const 기획력 = Math.min(100, Math.round(((answers.experienceTier ?? 1) / 5) * 60 + backgroundBonus));

    const techStackCount = answers.techStackList?.length ?? 0;
    const techStackScore = (Math.min(techStackCount, 8) / 8) * 50;
    const skillRatings = answers.skillRatings && Object.keys(answers.skillRatings).length > 0;
    const avgSkill = skillRatings ? Object.values(answers.skillRatings!).reduce((a, b) => a + b, 0) / Object.values(answers.skillRatings!).length : 0;
    const 기술력 = Math.min(100, Math.round(skillRatings ? techStackScore + (avgSkill / 5) * 50 : techStackScore * 2));

    const 소통력 = Math.min(100, Math.round(((answers.gitCollabLevel ?? 0) / 4) * 50 + (Math.min(answers.projectCount ?? 0, 5) / 5) * 30 + ((answers.actualRoles ?? []).length >= 2 ? 20 : 10)));

    const archetypeScoreMap: Record<string, number> = { initiator: 85, architect: 75, executor: 70, coordinator: 65, documenter: 55 };
    const archetypeBase = answers.workArchetype ? (archetypeScoreMap[answers.workArchetype] ?? 60) : 60;
    const workStyleBonus = ((answers.workStyleVector ?? [0, 0, 0]).reduce((a: number, b: number) => a + b, 0) / 100 / 3) * 15;
    const 추진력 = Math.min(100, Math.round(archetypeBase + workStyleBonus));

    const freeText = answers.freeText ?? '';
    const 창의력 = Math.min(100, freeText.length > 0 ? Math.round((Math.min(freeText.length, 300) / 300) * 60 + 40) : 30);

    const 성장력 = Math.min(100, Math.round(((answers.githubUrl ?? '').length > 0 ? 40 : 0) + (Math.min((answers.selfIntro ?? '').length, 300) / 300) * 60));

    return { 기획력, 기술력, 소통력, 추진력, 창의력, 성장력 };
  }

  /**
   * GET /api/teams/:teamId/topic
   * Screen 7 — AI 주제 조회 또는 생성 트리거
   */
  async getOrGenerateTopic(teamId: string, userId: string) {
    await this.requireMembership(teamId, userId);

    // survey_complete 단계인지 확인
    const status = await this.getKickoffStatus(teamId, userId);
    if (status.phase !== 'survey_complete') {
      throw new ForbiddenException({
        code: 'SURVEY_NOT_COMPLETE',
        message: '모든 팀원이 설문을 완료해야 합니다',
      });
    }

    const job = await this.prisma.kickoffTopicJob.findUnique({
      where: { teamId },
    });

    // job 없음 → 생성 후 백그라운드 생성 시작
    if (!job) {
      const newJob = await this.prisma.kickoffTopicJob.create({
        data: { teamId, status: 'pending' },
      });

      // 백그라운드 실행 (await 없음)
      void this._generateTopicsAsync(newJob.id, teamId);

      return { httpStatus: 202 as const, status: 'pending' as const, jobId: newJob.id };
    }

    // 처리 중
    if (job.status === 'pending' || job.status === 'processing') {
      return { httpStatus: 202 as const, status: job.status, jobId: job.id };
    }

    // 완료
    if (job.status === 'completed') {
      const topics = await this.prisma.kickoffTopic.findMany({
        where: { teamId },
        include: { reactions: true },
      });

      return {
        httpStatus: 200 as const,
        topics,
        confirmedTopic: topics.find((t) => t.confirmedAt) ?? null,
      };
    }

    // 실패
    return {
      httpStatus: 200 as const,
      status: 'failed' as const,
      errorMsg: job.errorMsg,
    };
  }

  /**
   * POST /api/teams/:teamId/topic/react
   * Screen 7 — 주제에 반응 (agree / concern)
   */
  async reactToTopic(
    teamId: string,
    userId: string,
    topicId: string,
    reaction: 'agree' | 'concern',
  ) {
    const membership = await this.requireMembership(teamId, userId);

    if (membership.role === 'observer') {
      throw new ForbiddenException({
        code: 'OBSERVER_CANNOT_REACT',
        message: '옵저버는 반응을 남길 수 없습니다',
      });
    }

    const topic = await this.prisma.kickoffTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException({
        code: 'TOPIC_NOT_FOUND',
        message: '주제를 찾을 수 없습니다',
      });
    }

    if (topic.teamId !== teamId) {
      throw new ForbiddenException({
        code: 'CROSS_TEAM_ACCESS',
        message: '다른 팀의 주제에 접근할 수 없습니다',
      });
    }

    if (topic.confirmedAt) {
      throw new ForbiddenException({
        code: 'PHASE_LOCKED',
        message: '이미 확정된 주제에는 반응을 변경할 수 없습니다',
      });
    }

    await this.prisma.kickoffReaction.upsert({
      where: { topicId_userId: { topicId, userId } },
      update: { reaction, teamId },
      create: { topicId, teamId, userId, reaction },
    });

    return { topicId, userId, reaction };
  }

  /**
   * POST /api/teams/:teamId/topic/confirm
   * Screen 7 — 주제 확정 (팀장 전용)
   */
  async confirmTopic(teamId: string, userId: string, topicId: string) {
    const membership = await this.requireMembership(teamId, userId);

    if (membership.role !== 'leader') {
      throw new ForbiddenException({
        code: 'LEADER_ONLY',
        message: '팀장만 주제를 확정할 수 있습니다',
      });
    }

    const topic = await this.prisma.kickoffTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException({
        code: 'TOPIC_NOT_FOUND',
        message: '주제를 찾을 수 없습니다',
      });
    }

    if (topic.teamId !== teamId) {
      throw new ForbiddenException({
        code: 'CROSS_TEAM_ACCESS',
        message: '다른 팀의 주제에 접근할 수 없습니다',
      });
    }

    // 이미 확정된 경우 idempotent 응답
    if (topic.confirmedAt) {
      return { topicId: topic.id, title: topic.title, confirmedAt: topic.confirmedAt };
    }

    const confirmedAt = new Date();
    await this.prisma.kickoffTopic.update({
      where: { id: topicId },
      data: { confirmedAt },
    });

    return { topicId: topic.id, title: topic.title, confirmedAt };
  }
}
