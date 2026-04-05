import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { EventsService } from "../events/events.service";
import OpenAI from "openai";
import { PLATFORM_PRESETS, matchPlatformPreset, type PlatformPresetKey } from "@teamforge/contracts";
import {
  OutOfScopeSchema,
  SuccessCriteriaSchema,
  CollabRulesSchema,
  MemberConcernsSchema,
  FirstIssuesArtifactSchema,
  FirstAgendaArtifactSchema,
  MiniAdrsArtifactSchema,
} from "@teamforge/contracts";

const VALID_CONCERN_TYPES = new Set([
  "stack_unfamiliar", "role_burden", "schedule_tight",
  "skill_gap", "environment_issue", "git_unfamiliar", "other",
]);

const ARCHITECTURE_CATEGORIES = [
  "framework",
  "styling",
  "realtime",
  "api",
  "server",
  "db",
  "auth",
  "state",
] as const;

type ArchCategory = (typeof ARCHITECTURE_CATEGORIES)[number];

const VALID_PHASES = [
  "topic_decision",
  "architecture",
  "summary",
  "completed",
] as const;
type Phase = (typeof VALID_PHASES)[number];

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Wrap user-supplied data in XML tags to prevent prompt injection */
function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

@Injectable()
export class KickoffService {
  private readonly logger = new Logger(KickoffService.name);
  private openai: OpenAI | null;

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private events: EventsService,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  // ============== Auth helpers ==============

  async verifyLeader(userId: string, teamId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership || membership.status !== "active") {
      throw new ForbiddenException("팀에 소속되어 있지 않습니다.");
    }
    if (membership.role !== "leader") {
      throw new ForbiddenException("팀장만 킥오프를 진행할 수 있습니다.");
    }
    return membership;
  }

  async verifyMember(userId: string, teamId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership || membership.status !== "active") {
      throw new ForbiddenException("팀에 소속되어 있지 않습니다.");
    }
    return membership;
  }

  // ============== Phase guard ==============

  private _assertPhase(session: { phase: string }, allowed: Phase[]) {
    if (!allowed.includes(session.phase as Phase)) {
      throw new BadRequestException(
        `현재 단계(${session.phase})에서는 이 작업을 수행할 수 없습니다. 허용: ${allowed.join(", ")}`,
      );
    }
  }

  // ============== Session CRUD ==============

  async startSession(userId: string, teamId: string) {
    await this.verifyLeader(userId, teamId);

    const existing = await this.prisma.kickoffSession.findUnique({
      where: { teamId },
    });
    if (existing) {
      return { session: existing };
    }

    const session = await this.prisma.kickoffSession.create({
      data: {
        teamId,
        startedBy: userId,
        phase: "topic_decision",
      },
    });

    this.realtime.emitToTeam(teamId, "kickoff:started", { phase: "topic_decision" });
    this.events.track("kickoff_started", { userId, teamId });
    return { session };
  }

  async getSession(teamId: string) {
    const session = await this.prisma.kickoffSession.findUnique({
      where: { teamId },
    });
    if (!session) throw new NotFoundException("킥오프 세션이 없습니다.");
    return session;
  }

  // ============== Phase navigation ==============

  /** Revert from architecture phase back to topic_decision for topic modification. */
  async revertToTopicPhase(userId: string, teamId: string) {
    await this.verifyLeader(userId, teamId);
    const session = await this.getSession(teamId);
    this._assertPhase(session, ["architecture"]);

    // Restore mermaid from the last topic_brainstorm message (if any)
    const lastBrainstormMermaid = await this.prisma.kickoffMessage.findFirst({
      where: { sessionId: session.id, phase: "topic_brainstorm", mermaidCode: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { mermaidCode: true },
    });

    await this.prisma.$transaction([
      this.prisma.kickoffMessage.deleteMany({
        where: { sessionId: session.id, phase: "architecture" },
      }),
      this.prisma.kickoffSession.update({
        where: { id: session.id },
        data: {
          phase: "topic_decision",
          architecture: Prisma.JsonNull,
          mermaidDiagram: lastBrainstormMermaid?.mermaidCode ?? null,
        },
      }),
    ]);

    this.realtime.emitToTeam(teamId, "kickoff:phase_changed", { phase: "topic_decision" });
    this.events.track("topic_reverted", { userId, teamId });

    return { reverted: true, phase: "topic_decision" };
  }

  // ============== Topic ==============

  async setTopicDirect(
    userId: string,
    teamId: string,
    body: {
      title: string;
      description: string;
      platformType?: string;
    },
  ) {
    await this.verifyLeader(userId, teamId);
    const session = await this.getSession(teamId);
    this._assertPhase(session, ["topic_decision"]);

    const classification = await this._classifyTopic(body.title, body.description);

    const updated = await this.prisma.kickoffSession.update({
      where: { id: session.id },
      data: {
        topicDecided: true,
        topicTitle: body.title,
        topicDescription: body.description,
        platformType: body.platformType ?? classification.platformType,
        features: classification.features,
        complexity: classification.complexity,
        phase: "architecture",
      },
    });

    this.realtime.emitToTeam(teamId, "kickoff:phase_changed", { phase: "architecture" });
    this.events.track("topic_decided", {
      userId,
      teamId,
      metadata: { method: "direct", title: body.title },
    });

    return { session: updated };
  }

  async confirmTopicFromChat(
    userId: string,
    teamId: string,
    body: { title: string; description: string },
  ) {
    await this.verifyLeader(userId, teamId);
    const session = await this.getSession(teamId);
    this._assertPhase(session, ["topic_decision"]);

    const classification = await this._classifyTopic(body.title, body.description);

    const updated = await this.prisma.kickoffSession.update({
      where: { id: session.id },
      data: {
        topicDecided: true,
        topicTitle: body.title,
        topicDescription: body.description,
        platformType: classification.platformType,
        features: classification.features,
        complexity: classification.complexity,
        phase: "architecture",
      },
    });

    this.realtime.emitToTeam(teamId, "kickoff:phase_changed", { phase: "architecture" });
    this.events.track("topic_decided", {
      userId,
      teamId,
      metadata: { method: "brainstorm", title: body.title },
    });

    return { session: updated };
  }

  // ============== Chat ==============

  async chatBrainstorm(
    userId: string,
    teamId: string,
    message: string,
    phase: "topic_brainstorm" | "architecture",
  ) {
    await this.verifyLeader(userId, teamId);
    const session = await this.getSession(teamId);

    // Phase guard: topic_brainstorm only in topic_decision, architecture only in architecture
    if (phase === "topic_brainstorm") {
      this._assertPhase(session, ["topic_decision"]);
    } else {
      this._assertPhase(session, ["architecture"]);
    }

    // Save user message
    await this.prisma.kickoffMessage.create({
      data: {
        sessionId: session.id,
        role: "user",
        content: message,
        phase,
      },
    });

    // Get chat history
    const history = await this.prisma.kickoffMessage.findMany({
      where: { sessionId: session.id, phase },
      orderBy: { createdAt: "asc" },
      take: 30,
    });

    // Get team context
    const teamContext = await this._getTeamContext(teamId);

    // Build brainstorm summary for architecture phase context continuity
    let brainstormSummary: string | undefined;
    if (phase === "architecture") {
      const brainstormMsgs = await this.prisma.kickoffMessage.findMany({
        where: { sessionId: session.id, phase: "topic_brainstorm" },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      if (brainstormMsgs.length > 0) {
        brainstormSummary = brainstormMsgs
          .reverse()
          .map((m) => `${m.role === "user" ? "사용자" : "AI"}: ${m.content.slice(0, 200)}`)
          .join("\n");
      }
    }

    // Build messages for AI
    // For architecture phase: pre-compute team level and applicable categories
    let archApplicableCategories: string[] | null = null;
    let archCurrentCategory: string | null = null;

    let systemPrompt: string;
    if (phase === "topic_brainstorm") {
      systemPrompt = this._topicBrainstormSystemPrompt(teamContext);
    } else {
      const features = Array.isArray(session.features) ? (session.features as string[]) : [];
      const [teamLevel, applicableCategories] = await Promise.all([
        this._computeTeamLevel(teamId),
        Promise.resolve(this._computeApplicableCategories(session.platformType, features)),
      ]);
      const confirmedCategories = (session.architecture as Record<string, string> | null) ?? {};
      archApplicableCategories = applicableCategories;
      archCurrentCategory =
        applicableCategories.find((cat) => !confirmedCategories[cat]) ?? null;
      systemPrompt = this._architectureSystemPrompt(teamContext, session, brainstormSummary, {
        teamLevel,
        applicableCategories,
        confirmedCategories,
        currentCategory: archCurrentCategory,
      });
    }

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Call AI
    const aiResponse = await this._callChat(messages);

    // For architecture phase: parse structured blocks and strip from content
    let displayContent = aiResponse;
    let stackUpdate: Record<string, string> | null = null;
    let optionCards: Array<{
      category: string;
      label: string;
      options: Array<{ name: string; reason: string; isPrimary: boolean }>;
    }> | null = null;
    if (phase === "architecture") {
      const withCards = this._parseOptionCards(aiResponse);
      const withStack = this._parseStackUpdate(withCards.content);
      displayContent = withStack.content;
      stackUpdate = withStack.stackUpdate;

      // Merge decided categories: session arch + this turn's stackUpdate
      const currentArch = (session.architecture as Record<string, string> | null) ?? {};
      const decidedAfterUpdate = { ...currentArch, ...(stackUpdate ?? {}) };

      // Next category after this update
      const nextCategory = archApplicableCategories
        ? archApplicableCategories.find((cat) => !decidedAfterUpdate[cat]) ?? null
        : archCurrentCategory;

      // Show single-category option card (next undecided), fall back to all undecided
      optionCards =
        withCards.optionCards ??
        (nextCategory
          ? this._buildOptionCards(session.platformType, decidedAfterUpdate, nextCategory)
          : this._buildOptionCards(session.platformType, decidedAfterUpdate));
    }

    // Extract mermaid code if present
    const mermaidCode = this._extractMermaid(displayContent);

    // Save assistant message (stripped content)
    const savedMsg = await this.prisma.kickoffMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: displayContent,
        mermaidCode,
        phase,
      },
    });

    // Update session mermaid diagram if new one generated
    if (mermaidCode) {
      await this.prisma.kickoffSession.update({
        where: { id: session.id },
        data: { mermaidDiagram: mermaidCode },
      });
    }

    // Apply stack update as sparse patch to session architecture
    if (stackUpdate) {
      const currentSession = await this.prisma.kickoffSession.findUnique({
        where: { id: session.id },
        select: { architecture: true },
      });
      const currentArch = (currentSession?.architecture as Record<string, string> | null) ?? {};
      const merged = { ...currentArch, ...stackUpdate };
      await this.prisma.kickoffSession.update({
        where: { id: session.id },
        data: { architecture: merged as object },
      });
    }

    this.realtime.emitToTeam(teamId, "kickoff:chat_updated", { phase });

    return {
      message: {
        id: savedMsg.id,
        role: "assistant",
        content: displayContent,
        mermaidCode,
        createdAt: savedMsg.createdAt.toISOString(),
        stackUpdate,
        optionCards,
      },
    };
  }

  async getChatHistory(
    teamId: string,
    phase: "topic_brainstorm" | "architecture",
  ) {
    const session = await this.getSession(teamId);
    const messages = await this.prisma.kickoffMessage.findMany({
      where: { sessionId: session.id, phase },
      orderBy: { createdAt: "asc" },
    });

    return messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      mermaidCode: m.mermaidCode,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  // --- #15: Reset chat for a phase ---
  async resetChat(
    userId: string,
    teamId: string,
    phase: "topic_brainstorm" | "architecture",
  ) {
    await this.verifyLeader(userId, teamId);
    const session = await this.getSession(teamId);

    // Only allow resetting chat for the current phase
    if (phase === "topic_brainstorm") {
      this._assertPhase(session, ["topic_decision"]);
    } else {
      this._assertPhase(session, ["architecture"]);
    }

    // Delete messages for this phase
    await this.prisma.kickoffMessage.deleteMany({
      where: { sessionId: session.id, phase },
    });

    // If resetting architecture chat, restore diagram from brainstorm phase
    if (phase === "architecture") {
      const lastBrainstormDiagram = await this.prisma.kickoffMessage.findFirst({
        where: {
          sessionId: session.id,
          phase: "topic_brainstorm",
          mermaidCode: { not: null },
        },
        orderBy: { createdAt: "desc" },
      });

      await this.prisma.kickoffSession.update({
        where: { id: session.id },
        data: {
          mermaidDiagram: lastBrainstormDiagram?.mermaidCode ?? null,
        },
      });

      this.realtime.emitToTeam(teamId, "kickoff:chat_reset", { phase });
      return { mermaidDiagram: lastBrainstormDiagram?.mermaidCode ?? null };
    }

    // If resetting topic brainstorm, clear session diagram
    await this.prisma.kickoffSession.update({
      where: { id: session.id },
      data: { mermaidDiagram: null },
    });

    this.realtime.emitToTeam(teamId, "kickoff:chat_reset", { phase });
    return { mermaidDiagram: null };
  }

  // ============== Architecture ==============

  async saveArchitecture(
    userId: string,
    teamId: string,
    architecture: Record<string, string>,
  ) {
    await this.verifyLeader(userId, teamId);
    const session = await this.getSession(teamId);
    this._assertPhase(session, ["architecture"]);

    // #7: Validate architecture keys
    const validated: Record<string, string> = {};
    for (const cat of ARCHITECTURE_CATEGORIES) {
      const val = architecture[cat];
      if (val && typeof val === "string" && val.trim()) {
        validated[cat] = val.trim().slice(0, 100);
      }
    }
    if (Object.keys(validated).length === 0) {
      throw new BadRequestException("최소 1개 이상의 기술 스택을 선택해야 합니다.");
    }

    const updated = await this.prisma.kickoffSession.update({
      where: { id: session.id },
      data: {
        architecture: validated as object,
        phase: "summary",
      },
    });

    this.realtime.emitToTeam(teamId, "kickoff:phase_changed", { phase: "summary" });
    this.events.track("architecture_decided", { userId, teamId });

    return { session: updated };
  }

  // ============== Finalize ==============

  async finalizeKickoff(userId: string, teamId: string) {
    await this.verifyLeader(userId, teamId);
    const session = await this.getSession(teamId);
    this._assertPhase(session, ["summary"]);

    if (!session.topicDecided) {
      throw new BadRequestException("주제가 결정되지 않았습니다.");
    }
    if (!session.architecture) {
      throw new BadRequestException("기술 스택이 결정되지 않았습니다.");
    }

    // Batch D: 전원 서명 확인
    const nonObserverMembers = await this.prisma.teamMember.findMany({
      where: { teamId, status: "active", role: { not: "observer" } },
    });
    const participants = await this.prisma.kickoffParticipant.findMany({
      where: { sessionId: session.id },
    });
    const signedIds = new Set(
      participants.filter((p) => p.signedAt !== null).map((p) => p.userId),
    );
    const unsignedMembers = nonObserverMembers.filter((m) => !signedIds.has(m.userId));
    if (unsignedMembers.length > 0) {
      throw new BadRequestException(
        `아직 서명하지 않은 팀원이 ${unsignedMembers.length}명 있습니다.`,
      );
    }

    const updated = await this.prisma.kickoffSession.update({
      where: { id: session.id },
      data: {
        summaryConfirmed: true,
        phase: "completed",
      },
    });

    // Save to team selectedStack
    await this.prisma.team.update({
      where: { id: teamId },
      data: { selectedStack: session.architecture as object },
    });

    this.realtime.emitToTeam(teamId, "kickoff:completed", {
      topicTitle: session.topicTitle,
    });

    this.events.track("kickoff_completed", { userId, teamId });

    return { session: updated };
  }

  // ============== Batch A: 의사결정 입력 ==============

  async saveDecisions(
    userId: string,
    teamId: string,
    body: {
      outOfScope?: string[];
      successCriteria?: string[];
      collabRules?: {
        branchStrategy: string;
        prRule: string;
        issueRule: string;
        meetingCycle: string;
      };
    },
  ) {
    await this.verifyLeader(userId, teamId);
    const session = await this.getSession(teamId);
    this._assertPhase(session, ["summary"]);

    const data: Record<string, unknown> = { revision: { increment: 1 } };
    if (body.outOfScope !== undefined) {
      data.outOfScope = OutOfScopeSchema.parse(body.outOfScope);
    }
    if (body.successCriteria !== undefined) {
      data.successCriteria = SuccessCriteriaSchema.parse(body.successCriteria.filter(Boolean));
    }
    if (body.collabRules !== undefined) {
      data.collabRules = CollabRulesSchema.parse({ version: 1, ...body.collabRules });
    }

    const updated = await this.prisma.kickoffSession.update({
      where: { id: session.id },
      data: data as Parameters<typeof this.prisma.kickoffSession.update>[0]["data"],
    });

    this.realtime.emitToTeam(teamId, "kickoff:decisions_updated", {
      outOfScope: updated.outOfScope,
      successCriteria: updated.successCriteria,
      collabRules: updated.collabRules,
    });

    return { session: updated };
  }

  async saveConcerns(
    userId: string,
    teamId: string,
    concerns: Array<{ type: string; detail?: string }>,
  ) {
    await this.verifyMember(userId, teamId);
    const session = await this.getSession(teamId);
    this._assertPhase(session, ["summary"]);

    // 화이트리스트 검증
    for (const c of concerns) {
      if (!VALID_CONCERN_TYPES.has(c.type)) {
        throw new BadRequestException(`올바르지 않은 우려 유형입니다: ${c.type}`);
      }
    }

    const enriched = MemberConcernsSchema.parse(
      concerns.map((c) => ({ ...c, createdAt: new Date().toISOString() })),
    );

    const participant = await this.prisma.kickoffParticipant.upsert({
      where: { sessionId_userId: { sessionId: session.id, userId } },
      create: { sessionId: session.id, userId, concerns: enriched },
      update: { concerns: enriched },
    });

    this.realtime.emitToTeam(teamId, "kickoff:concerns_updated", { userId });

    return { participant };
  }

  // ============== Batch B: 역할 수락/조정 ==============

  async updateRoleStatus(
    requesterId: string,
    teamId: string,
    targetUserId: string,
    status: "accepted" | "adjustment_requested" | "declined",
    alternativeRole?: string,
  ) {
    // 본인 또는 팀장만 가능
    if (requesterId !== targetUserId) {
      await this.verifyLeader(requesterId, teamId);
    } else {
      await this.verifyMember(requesterId, teamId);
    }
    const session = await this.getSession(teamId);
    this._assertPhase(session, ["summary"]);

    const participant = await this.prisma.kickoffParticipant.upsert({
      where: { sessionId_userId: { sessionId: session.id, userId: targetUserId } },
      create: {
        sessionId: session.id,
        userId: targetUserId,
        roleAcceptanceStatus: status,
        alternativeRole: alternativeRole ?? null,
      },
      update: {
        roleAcceptanceStatus: status,
        alternativeRole: alternativeRole ?? null,
      },
    });

    this.realtime.emitToTeam(teamId, "kickoff:role_status_updated", {
      userId: targetUserId,
      status,
      alternativeRole,
    });

    // 전원 수락 여부 확인 후 이벤트 발송
    const nonObserverMembers = await this.prisma.teamMember.findMany({
      where: { teamId, status: "active", role: { not: "observer" } },
    });
    const allParticipants = await this.prisma.kickoffParticipant.findMany({
      where: { sessionId: session.id },
    });
    const acceptedIds = new Set(
      allParticipants
        .filter((p) => p.roleAcceptanceStatus === "accepted")
        .map((p) => p.userId),
    );
    const allAccepted = nonObserverMembers.every((m) => acceptedIds.has(m.userId));
    if (allAccepted && nonObserverMembers.length > 0) {
      this.realtime.emitToTeam(teamId, "kickoff:all_roles_accepted", {});
    }

    return { participant };
  }

  async getParticipants(teamId: string) {
    const session = await this.getSession(teamId);
    const participants = await this.prisma.kickoffParticipant.findMany({
      where: { sessionId: session.id },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    return participants.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      avatarUrl: p.user.avatarUrl,
      concerns: p.concerns,
      roleAcceptanceStatus: p.roleAcceptanceStatus,
      alternativeRole: p.alternativeRole,
      signedAt: p.signedAt?.toISOString() ?? null,
    }));
  }

  // ============== Batch C: AI 산출물 생성 ==============

  async generateArtifacts(userId: string, teamId: string) {
    await this.verifyLeader(userId, teamId);
    const session = await this.getSession(teamId);
    this._assertPhase(session, ["summary"]);

    // Atomic 잠금: generating 상태가 아닐 때만 업데이트 (TOCTOU 방지)
    const locked = await this.prisma.kickoffSession.updateMany({
      where: { id: session.id, generationStatus: { not: "generating" } },
      data: { generationStatus: "generating", generationRequestedAt: new Date() },
    });
    if (locked.count === 0) {
      throw new BadRequestException("이미 생성 중입니다. 잠시 후 다시 시도해주세요.");
    }

    try {
      const summary = await this.getSummary(teamId);
      const teamCtx = summary.team;
      const sess = summary.session;

      const [issuesResult, agendaResult, adrsResult] = await Promise.all([
        this._generateFirstIssues(sess, teamCtx),
        this._generateFirstAgenda(sess, teamCtx),
        this._generateMiniAdrs(sess),
      ]);

      const currentRevision = (
        await this.prisma.kickoffSession.findUnique({
          where: { id: session.id },
          select: { revision: true },
        })
      )?.revision ?? 0;

      // 기존 draft artifact 삭제 후 재생성
      await this.prisma.kickoffArtifact.deleteMany({
        where: { sessionId: session.id, status: "draft" },
      });

      // Zod 검증 후 저장
      const validatedIssues = FirstIssuesArtifactSchema.safeParse(issuesResult);
      const validatedAgenda = FirstAgendaArtifactSchema.safeParse(agendaResult);
      const validatedAdrs = MiniAdrsArtifactSchema.safeParse(adrsResult);

      const artifacts = await this.prisma.kickoffArtifact.createMany({
        data: [
          {
            sessionId: session.id,
            artifactType: "first_issues",
            content: (validatedIssues.success ? validatedIssues.data : issuesResult) as object,
            sessionRevision: currentRevision,
            status: "draft",
          },
          {
            sessionId: session.id,
            artifactType: "first_agenda",
            content: (validatedAgenda.success ? validatedAgenda.data : agendaResult) as object,
            sessionRevision: currentRevision,
            status: "draft",
          },
          {
            sessionId: session.id,
            artifactType: "mini_adrs",
            content: (validatedAdrs.success ? validatedAdrs.data : adrsResult) as object,
            sessionRevision: currentRevision,
            status: "draft",
          },
        ],
      });

      await this.prisma.kickoffSession.update({
        where: { id: session.id },
        data: { generationStatus: "done", generationCompletedAt: new Date() },
      });

      this.realtime.emitToTeam(teamId, "kickoff:artifacts_ready", { count: artifacts.count });
      return { count: artifacts.count };
    } catch (err) {
      await this.prisma.kickoffSession.update({
        where: { id: session.id },
        data: { generationStatus: "failed" },
      });
      throw err;
    }
  }

  async getArtifacts(teamId: string) {
    const session = await this.getSession(teamId);
    const artifacts = await this.prisma.kickoffArtifact.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
    });
    return artifacts.map((a) => ({
      id: a.id,
      artifactType: a.artifactType,
      content: a.content,
      status: a.status,
      sessionRevision: a.sessionRevision,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  // ============== Batch D: 서명 게이트 ==============

  async signSummary(userId: string, teamId: string) {
    await this.verifyMember(userId, teamId);
    const session = await this.getSession(teamId);
    this._assertPhase(session, ["summary"]);

    const participant = await this.prisma.kickoffParticipant.upsert({
      where: { sessionId_userId: { sessionId: session.id, userId } },
      create: {
        sessionId: session.id,
        userId,
        signedAt: new Date(),
        signedRevision: session.revision,
      },
      update: {
        signedAt: new Date(),
        signedRevision: session.revision,
      },
    });

    this.realtime.emitToTeam(teamId, "kickoff:member_signed", { userId });
    return { participant };
  }

  // ============== Summary ==============

  async getSummary(teamId: string) {
    const session = await this.getSession(teamId);
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { status: "active" },
          include: { user: true },
        },
      },
    });
    if (!team) throw new NotFoundException("팀을 찾을 수 없습니다.");

    // #13: Removed unused skillAssessment.findMany() — only rawVectors needed
    const rawVectors = await this.prisma.$queryRaw<
      { user_id: string; skill_vector: string }[]
    >`
      SELECT user_id, skill_vector::text FROM skill_assessments
      WHERE team_id = ${teamId}::uuid AND status = 'completed' AND skill_vector IS NOT NULL
    `;
    const vectorMap = new Map<string, number[]>();
    for (const rv of rawVectors) {
      const nums = rv.skill_vector
        .replace(/[\[\]]/g, "")
        .split(",")
        .map(Number);
      vectorMap.set(rv.user_id, nums);
    }

    return {
      session: {
        id: session.id,
        phase: session.phase,
        topicTitle: session.topicTitle,
        topicDescription: session.topicDescription,
        platformType: session.platformType,
        features: session.features,
        complexity: session.complexity,
        architecture: session.architecture,
        mermaidDiagram: session.mermaidDiagram,
        summaryConfirmed: session.summaryConfirmed,
        outOfScope: session.outOfScope,
        successCriteria: session.successCriteria,
        collabRules: session.collabRules,
        revision: session.revision,
        generationStatus: session.generationStatus,
      },
      team: {
        id: team.id,
        name: team.name,
        members: team.members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          role: m.role,
          skillVector: vectorMap.has(m.userId)
            ? vectorMap.get(m.userId)
            : null,
        })),
      },
    };
  }

  // ============== Private helpers ==============

  private async _getTeamContext(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { status: "active" },
          include: { user: true },
        },
      },
    });

    const assessments = await this.prisma.skillAssessment.findMany({
      where: { teamId, status: "completed" },
      select: { userId: true, answers: true },
    });

    const rawVectors = await this.prisma.$queryRaw<
      { user_id: string; skill_vector: string }[]
    >`
      SELECT user_id, skill_vector::text FROM skill_assessments
      WHERE team_id = ${teamId}::uuid AND status = 'completed' AND skill_vector IS NOT NULL
    `;

    const SKILL_LABELS = [
      "backend",
      "frontend",
      "database",
      "devops",
      "aiMl",
      "design",
    ];
    const memberProfiles: string[] = [];

    for (const m of team?.members ?? []) {
      const vec = rawVectors.find((rv) => rv.user_id === m.userId);
      if (vec) {
        const nums = vec.skill_vector
          .replace(/[\[\]]/g, "")
          .split(",")
          .map(Number);
        const skills = SKILL_LABELS.map(
          (l, i) => `${l}: ${nums[i]?.toFixed(1) ?? "0"}`,
        ).join(", ");
        const assessment = assessments.find((a) => a.userId === m.userId);
        const answers = assessment?.answers as Record<string, unknown> | undefined;
        const desired = (answers?.desiredRoles ?? []) as string[];
        memberProfiles.push(
          `${m.user.name} (${m.role}) — 스킬: [${skills}], 희망역할: [${desired.join(", ")}]`,
        );
      } else {
        memberProfiles.push(`${m.user.name} (${m.role}) — 설문 미완료`);
      }
    }

    return {
      teamName: team?.name ?? "",
      memberCount: team?.members.length ?? 0,
      memberProfiles,
    };
  }

  /** Classify team experience level from completed skill assessments */
  private async _computeTeamLevel(
    teamId: string,
  ): Promise<"beginner" | "intermediate" | "advanced" | "unknown"> {
    const assessments = await this.prisma.skillAssessment.findMany({
      where: { teamId, status: "completed" },
      select: { experienceScore: true },
    });
    const scores = assessments
      .map((a) => a.experienceScore)
      .filter((s): s is number => s !== null && s !== undefined);
    if (scores.length === 0) return "unknown";
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < 2) return "beginner";
    if (avg <= 3.5) return "intermediate";
    return "advanced";
  }

  /**
   * Determine which stack categories are relevant for this project.
   * Uses PLATFORM_PRESETS.applicableCategories if a preset is matched,
   * otherwise falls back to all 8 categories in recommended order.
   */
  private _computeApplicableCategories(
    platformType: string | null,
    features: string[],
  ): string[] {
    const DEFAULT_ORDER = [
      "framework", "server", "db", "auth", "api", "realtime", "state", "styling",
    ];

    // Try exact preset key match (platformType may already be like "web_marketplace")
    const presetKey = (
      platformType &&
      (PLATFORM_PRESETS as Record<string, unknown>)[platformType]
    )
      ? (platformType as PlatformPresetKey)
      : matchPlatformPreset(features);

    if (presetKey) {
      const preset = (
        PLATFORM_PRESETS as Record<string, (typeof PLATFORM_PRESETS)[PlatformPresetKey]>
      )[presetKey];
      if (preset?.applicableCategories?.length > 0) {
        return [...preset.applicableCategories];
      }
    }

    return DEFAULT_ORDER;
  }

  // #6: All user-supplied data wrapped in XML boundaries
  private _topicBrainstormSystemPrompt(ctx: {
    teamName: string;
    memberCount: number;
    memberProfiles: string[];
  }): string {
    return `당신은 대학교 팀 프로젝트의 주제를 결정하는 것을 도와주는 AI 어시스턴트입니다.

<team_info>
- 팀 이름: <team_name>${xmlEscape(ctx.teamName)}</team_name>
- 팀원 수: ${ctx.memberCount}명
- 팀원 프로필:
${ctx.memberProfiles.map((p) => `  - <member>${xmlEscape(p)}</member>`).join("\n")}
</team_info>

역할:
1. 팀의 기술 스택과 강점을 고려하여 프로젝트 주제를 제안하세요.
2. 유저가 아이디어를 말하면 구체화를 도와주세요.
3. 대화가 진행되면서 프로젝트의 윤곽이 잡히면, mermaid 다이어그램으로 프로젝트 구조를 시각화해주세요.
4. 주제가 어느 정도 결정되었다고 판단되면, "주제가 정리된 것 같아요! 다음 단계(기술 스택 결정)로 넘어갈까요?" 라고 제안하세요.

규칙:
- 한국어로 대화하세요.
- 답변은 간결하게 (3~5문장 텍스트 + 다이어그램).
- mermaid 다이어그램을 포함할 때는 \`\`\`mermaid\n...\n\`\`\` 코드 블록으로 감싸세요.
- 다이어그램은 프로젝트의 기능 구조, 사용자 흐름, 또는 시스템 개요를 표현하세요.

<diagram_rules>
**다이어그램 자동 업데이트 규칙 (매우 중요):**
1. 첫 번째 응답: 텍스트만 (아이디어 탐색).
2. 두 번째 응답부터: 반드시 mermaid 다이어그램을 포함하세요.
3. **이후 모든 응답에서 반드시 다이어그램을 포함하세요.** 대화에서 새로운 기능, 변경사항, 구체화가 이루어질 때마다 이전 다이어그램을 업데이트하여 최신 상태를 반영하세요.
4. 다이어그램은 "새로 그리는 것"이 아니라 "이전 버전을 발전시키는 것"입니다. 대화가 진행될수록 다이어그램이 점점 상세해져야 합니다.
5. 사용자가 명시적으로 다이어그램 변경을 요청하지 않아도, 대화 내용이 다이어그램에 반영될 사항이면 자동으로 업데이트하세요.

**mermaid 문법 주의사항:**
- flowchart(graph) 타입만 사용하세요. sequence, classDiagram 등은 사용하지 마세요.
- style, classDef, class 지시문은 사용하지 마세요. 렌더링 오류의 주원인입니다.
- 노드 이름에 한국어를 사용할 때는 반드시 대괄호로 감싸세요: A[한국어 이름]
- 노드 ID는 영문 2~3자로 짧게: A1[프론트엔드], B1[백엔드]
- subgraph 사용 시 end로 반드시 닫으세요.
- 화살표는 --> 만 사용하세요.
</diagram_rules>

<off_topic_guard>
중요: 당신의 역할은 오직 "팀 프로젝트 주제 브레인스토밍"입니다.
- 프로젝트 주제 선정과 관련 없는 질문(일상 대화, 숙제 도움, 코딩 질문, 일반 지식 등)이 들어오면:
  "저는 프로젝트 주제 브레인스토밍을 도와주는 어시스턴트예요! 주제와 관련된 이야기를 해주시면 더 잘 도와드릴 수 있어요."
  라고 답하고 주제 논의로 자연스럽게 유도하세요.
- 절대 주제 선정 외의 요청에 응하지 마세요.
</off_topic_guard>`;
  }

  private _architectureSystemPrompt(
    ctx: {
      teamName: string;
      memberCount: number;
      memberProfiles: string[];
    },
    session: {
      topicTitle: string | null;
      topicDescription: string | null;
      platformType: string | null;
      features: unknown;
      complexity: string | null;
      mermaidDiagram: string | null;
    },
    brainstormSummary?: string,
    options?: {
      teamLevel?: "beginner" | "intermediate" | "advanced" | "unknown";
      applicableCategories?: string[];
      confirmedCategories?: Record<string, string>;
      currentCategory?: string | null;
    },
  ): string {
    const features = Array.isArray(session.features) ? session.features : [];
    const contextBlock = brainstormSummary
      ? `\n<brainstorm_context>\n${xmlEscape(brainstormSummary)}\n</brainstorm_context>\n`
      : "";
    const mermaidBlock = session.mermaidDiagram
      ? `\n<previous_diagram>\n${session.mermaidDiagram}\n</previous_diagram>\n**다이어그램 진화 규칙**: 위 다이어그램은 주제 선정 단계에서 만들어진 기능 구조도입니다. 기존 노드와 구조를 유지하면서 기술 스택 레이어(서버, DB, 인증, 프론트엔드 등)를 추가하여 아키텍처 다이어그램으로 발전시키세요. 기존 내용을 삭제하거나 처음부터 다시 그리지 마세요.\n`
      : "";

    const presetContext = this._buildPresetContext(session.platformType);

    // ── 팀 수준 기반 말투 지침 ──────────────────────────────
    const teamLevel = options?.teamLevel ?? "unknown";
    const toneLine = {
      beginner: "팀 수준: 입문/초급. **쉬운 말투**로 설명하세요 — 설정 복잡도를 최소화하고, 관리형 서비스(Supabase, Clerk, Firebase 등)를 우선 추천하며, \"처음 써도 괜찮아요\", \"설정 없이 바로 쓸 수 있어요\" 같은 안심형 표현을 사용하세요. 성능/최적화보다 빠른 시작과 학습 편의를 우선합니다.",
      intermediate: "팀 수준: 중급. 실용적인 균형 추천을 하세요 — 학습 비용과 생산성을 함께 고려하고, 팀 규모에 맞는 선택임을 근거로 제시하세요.",
      advanced: "팀 수준: 고급. **기술적 표현 허용** — 커스텀 미들웨어, 성능 튜닝, 확장성, 트레이드오프를 포함해 설명하세요. 복잡한 선택지도 근거 있게 제안하세요.",
      unknown: "팀 수준 데이터 없음. 중급 수준으로 설명하세요.",
    }[teamLevel];

    // ── 현재 추천 단계 지침 ──────────────────────────────────
    const currentCategory = options?.currentCategory ?? null;
    const confirmedCategories = options?.confirmedCategories ?? {};
    const applicableCategories = options?.applicableCategories ?? null;

    const confirmedKeys = Object.keys(confirmedCategories).filter((k) => confirmedCategories[k]);
    const confirmedBlock =
      confirmedKeys.length > 0
        ? `\n<confirmed_stack>\n${confirmedKeys.map((k) => `  <${k}>${xmlEscape(confirmedCategories[k])}</${k}>`).join("\n")}\n</confirmed_stack>\n이미 결정된 항목입니다. 언급하지 마세요.`
        : "";

    const stepInstruction = currentCategory
      ? `\n<current_step>\n이번 응답에서는 **${currentCategory.toUpperCase()}** 카테고리만 추천하세요.\n- 추천 이유 2~3문장 (팀 수준 근거 포함)\n- 대안 2~3개와 각각의 한 줄 이유\n- 다른 카테고리는 언급하지 마세요\n- <stack_update>에는 ${currentCategory} 항목만 포함하세요\n</current_step>`
      : "";

    const remainingBlock = applicableCategories
      ? `\n<applicable_categories>${applicableCategories.join(", ")}</applicable_categories>\n이 프로젝트에 필요한 카테고리만 다룹니다. 목록에 없는 카테고리는 추천하지 마세요.`
      : "";

    return `당신은 대학교 팀 프로젝트의 기술 아키텍처를 설계하는 것을 도와주는 AI 어시스턴트입니다.

<team_info>
- 팀 이름: <team_name>${xmlEscape(ctx.teamName)}</team_name>
- 프로젝트 주제: <topic>${xmlEscape(session.topicTitle ?? "미정")}</topic>
- 프로젝트 설명: <description>${xmlEscape(session.topicDescription ?? "")}</description>
- 플랫폼: ${xmlEscape(session.platformType ?? "미정")}
- 복잡도: ${xmlEscape(session.complexity ?? "미정")}
- 핵심 기능: ${features.length > 0 ? features.map((f) => xmlEscape(String(f))).join(", ") : "미정"}
- 팀원 수: ${ctx.memberCount}명
- 팀원 프로필:
${ctx.memberProfiles.map((p) => `  - <member>${xmlEscape(p)}</member>`).join("\n")}
</team_info>

<tone_instruction>${toneLine}</tone_instruction>
${presetContext}${contextBlock}${mermaidBlock}${confirmedBlock}${stepInstruction}${remainingBlock}

역할:
1. 지정된 카테고리(또는 전체)에 대해 팀 스킬과 프로젝트 특성을 고려해 추천하세요.
2. 사용자가 특정 기술을 선택했다고 알리면 그 선택을 반영하고 다음 카테고리로 넘어가세요.
3. 모든 카테고리가 결정되면 간략한 최종 아키텍처 요약을 제시하세요.

**응답 형식 규칙**
- 한국어로 대화하세요.
- 텍스트는 2~4문장으로 간결하게. 카테고리 번호 목록 나열 금지.
- mermaid 다이어그램: 스택이 결정될 때마다 \`\`\`mermaid\n...\n\`\`\` 블록으로 업데이트.
- **응답 맨 끝**에 결정/추천 항목을 아래 XML 블록으로 포함하세요:

<stack_update>
  <framework>Next.js</framework>
  <db>PostgreSQL + Prisma</db>
</stack_update>

규칙: 이번 응답에서 추천하거나 사용자가 확정한 항목만 포함. 없으면 빈 <stack_update></stack_update>.
- <stack_update> 블록은 사용자에게 표시되지 않습니다.

<diagram_rules>
**다이어그램 자동 업데이트 규칙 (매우 중요):**
1. 첫 번째 응답: 현재 결정된 스택을 기반으로 아키텍처 다이어그램을 생성하세요.
2. **이후 모든 응답에서 반드시 다이어그램을 포함하세요.** 사용자가 스택을 선택하거나 변경할 때마다 다이어그램에 자동 반영하세요.
3. 다이어그램은 "새로 그리는 것"이 아니라 "이전 버전에 결정사항을 추가하는 것"입니다. 선택이 진행될수록 다이어그램이 점점 완성되어야 합니다.

**mermaid 문법 주의사항:**
- flowchart(graph) 타입만 사용하세요. sequence, classDiagram 등은 사용하지 마세요.
- style, classDef, class 지시문은 사용하지 마세요. 렌더링 오류의 주원인입니다.
- 노드 이름에 한국어를 사용할 때는 반드시 대괄호로 감싸세요: A[한국어 이름]
- 노드 ID는 영문 2~3자로 짧게: A1[프론트엔드], B1[백엔드]
- subgraph 사용 시 end로 반드시 닫으세요.
- 화살표는 --> 만 사용하세요.
</diagram_rules>

<off_topic_guard>
중요: 당신의 역할은 오직 "기술 아키텍처 설계"입니다.
- 아키텍처/기술 스택 결정과 관련 없는 질문이 들어오면:
  "저는 기술 스택 설계를 도와주는 어시스턴트예요! 아키텍처와 관련된 질문을 해주시면 더 잘 도와드릴 수 있어요."
  라고 답하고 아키텍처 논의로 유도하세요.
- 절대 아키텍처 설계 외의 요청에 응하지 마세요.
</off_topic_guard>`;
  }

  // #8: Log errors instead of swallowing
  private async _callChat(messages: ChatMessage[]): Promise<string> {
    if (!this.openai) {
      return "AI 연결이 설정되지 않았습니다. OPENAI_API_KEY 환경변수를 확인해주세요.";
    }

    let retries = 3;
    while (retries > 0) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: 0.7,
          max_tokens: 2000,
        });

        return response.choices[0]?.message?.content ?? "응답을 생성하지 못했습니다.";
      } catch (err) {
        retries--;
        this.logger.error(`AI chat call failed (retries left: ${retries})`, err);
        if (retries === 0)
          return "AI 응답 생성에 실패했습니다. 다시 시도해주세요.";
      }
    }

    return "AI 응답 생성에 실패했습니다. 다시 시도해주세요.";
  }

  private async _classifyTopic(
    title: string,
    description: string,
  ): Promise<{
    platformType: string;
    features: string[];
    complexity: string;
  }> {
    if (!this.openai) {
      return { platformType: "web", features: [], complexity: "moderate" };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `프로젝트 주제를 분석하여 다음 JSON으로 응답하세요:
{
  "platformType": "web" | "mobile" | "desktop" | "embedded" | "data",
  "features": ["핵심 기능 1", "핵심 기능 2", ...],
  "complexity": "simple" | "moderate" | "complex"
}`,
          },
          {
            role: "user",
            content: `<user_input>\n제목: ${xmlEscape(title)}\n설명: ${xmlEscape(description)}\n</user_input>`,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return { platformType: "web", features: [], complexity: "moderate" };

      const parsed = JSON.parse(content);
      return {
        platformType: parsed.platformType ?? "web",
        features: Array.isArray(parsed.features) ? parsed.features : [],
        complexity: parsed.complexity ?? "moderate",
      };
    } catch (err) {
      this.logger.error("Topic classification failed", err);
      return { platformType: "web", features: [], complexity: "moderate" };
    }
  }

  private _extractMermaid(text: string): string | null {
    const match = text.match(/```mermaid\n([\s\S]*?)```/);
    return match?.[1]?.trim() ?? null;
  }

  /**
   * Parse <stack_update> XML block from AI response.
   * Returns only valid architecture category keys.
   * Strips the block from the returned content string.
   */
  private _parseStackUpdate(text: string): {
    content: string;
    stackUpdate: Record<string, string> | null;
  } {
    const blockMatch = text.match(/<stack_update>([\s\S]*?)<\/stack_update>/);
    if (!blockMatch) return { content: text, stackUpdate: null };

    const block = blockMatch[1];
    const update: Record<string, string> = {};

    for (const cat of ARCHITECTURE_CATEGORIES) {
      const tagMatch = block.match(new RegExp(`<${cat}>([^<]*)<\/${cat}>`));
      const val = tagMatch?.[1]?.trim();
      if (val && val.length > 0 && val.length <= 100) {
        update[cat] = val;
      }
    }

    const cleaned = text.replace(/<stack_update>[\s\S]*?<\/stack_update>/g, "").trim();
    return {
      content: cleaned,
      stackUpdate: Object.keys(update).length > 0 ? update : null,
    };
  }

  /**
   * Parse <option_cards> JSON block from AI response.
   * Strips the block from the returned content string.
   */
  private _parseOptionCards(text: string): {
    content: string;
    optionCards: Array<{
      category: string;
      label: string;
      options: Array<{ name: string; reason: string; isPrimary: boolean }>;
    }> | null;
  } {
    const blockMatch = text.match(/<option_cards>([\s\S]*?)<\/option_cards>/);
    if (!blockMatch) return { content: text, optionCards: null };

    type ParsedCard = { category: string; label: string; options: Array<{ name: string; reason: string; isPrimary: boolean }> };
    let optionCards: ParsedCard[] | null = null;
    try {
      const parsed = JSON.parse(blockMatch[1].trim());
      if (Array.isArray(parsed)) {
        const cards: ParsedCard[] = parsed
          .filter(
            (c) =>
              typeof c.category === "string" &&
              ARCHITECTURE_CATEGORIES.includes(c.category as ArchCategory) &&
              Array.isArray(c.options),
          )
          .map((c) => ({
            category: c.category as string,
            label: c.label ?? c.category,
            options: (c.options as Array<{ name: string; reason?: string; isPrimary?: boolean }>)
              .filter((o) => typeof o.name === "string" && o.name.trim())
              .map((o) => ({
                name: o.name.trim().slice(0, 100),
                reason: (o.reason ?? "").trim().slice(0, 200),
                isPrimary: !!o.isPrimary,
              }))
              .slice(0, 5),
          }));
        if (cards.length > 0) optionCards = cards;
      }
    } catch {
      // JSON parse failed — treat as no option cards
    }

    const cleaned = text.replace(/<option_cards>[\s\S]*?<\/option_cards>/g, "").trim();
    return { content: cleaned, optionCards };
  }

  /**
   * Generate option cards server-side from platform presets.
   * Shows options for all undecided categories.
   * This is the reliable fallback when AI doesn't output <option_cards>.
   */
  private _buildOptionCards(
    platformType: string | null,
    decidedCategories: Record<string, string>,
    targetCategory?: string,
  ): Array<{
    category: string;
    label: string;
    options: Array<{ name: string; reason: string; isPrimary: boolean }>;
  }> | null {
    // Per-option reason lookup (common knowledge)
    const OPTION_REASONS: Record<string, string> = {
      "Next.js": "SSR/SSG 지원으로 SEO와 성능이 좋고, 풀스택 개발에 적합합니다",
      "Remix": "서버 중심 렌더링으로 데이터 패칭이 간결하고 빠릅니다",
      "SvelteKit": "컴파일 기반으로 번들 크기가 작고 빠른 빌드가 특징입니다",
      "React (Vite)": "SPA에 적합하고 빠른 HMR로 개발 경험이 좋습니다",
      "Vue 3 (Nuxt)": "학습 곡선이 낮고 직관적인 문법으로 진입 장벽이 낮습니다",
      "React Native (Expo)": "JavaScript/TypeScript로 iOS/Android 동시 개발이 가능합니다",
      "Flutter": "Dart 언어 기반, 네이티브 수준 성능의 크로스플랫폼 앱 개발",
      "Ionic": "웹 기술(HTML/CSS/JS)로 모바일 앱을 쉽게 만들 수 있습니다",
      "Tailwind CSS": "유틸리티 클래스로 빠른 스타일링, 커스터마이징이 자유롭습니다",
      "CSS Modules": "컴포넌트 스코프 스타일로 충돌 없는 안전한 스타일링",
      "styled-components": "CSS-in-JS 방식으로 동적 스타일링이 편리합니다",
      "Chakra UI": "접근성 최적화된 컴포넌트 라이브러리, 빠른 프로토타이핑에 좋습니다",
      "MUI": "구글 Material Design 기반, 완성도 높은 컴포넌트 세트",
      "Socket.io": "실시간 양방향 통신, 채팅·알림 기능 구현에 표준적입니다",
      "WebSocket (native)": "의존성 없는 순수 WebSocket, 가볍고 직접 제어 가능합니다",
      "SSE": "서버→클라이언트 단방향 스트림, 알림·피드에 적합합니다",
      "Firebase Realtime DB": "설정 없이 바로 실시간 동기화, 초기 개발 속도가 빠릅니다",
      "Supabase Realtime": "PostgreSQL 기반 실시간 구독, 백엔드와 통합이 쉽습니다",
      "불필요": "실시간 기능이 불필요한 경우, 폴링 또는 REST로 충분합니다",
      "REST": "단순하고 표준화된 API, 팀 간 협업과 문서화가 쉽습니다",
      "GraphQL": "클라이언트가 필요한 데이터만 요청, 과도한 페칭을 줄입니다",
      "tRPC": "TypeScript 엔드투엔드 타입 안전성, 풀스택 TS 팀에 최적입니다",
      "REST + WebSocket": "REST API에 실시간 기능을 추가한 하이브리드 구성",
      "NestJS": "TypeScript 기반 구조화된 프레임워크, 대규모 프로젝트에 유리합니다",
      "Express": "가볍고 유연한 Node.js 프레임워크, 빠른 시작이 가능합니다",
      "Fastify": "Express보다 2배 빠른 Node.js 서버, 성능이 중요할 때 선택합니다",
      "Hono": "엣지 런타임 지원, 초경량 웹 프레임워크입니다",
      "FastAPI": "Python 기반 비동기 처리, 자동 API 문서와 빠른 개발이 강점입니다",
      "Spring Boot": "Java/Kotlin 기반, 엔터프라이즈 수준의 안정성과 생태계",
      "Django": "Python 배터리 포함 프레임워크, 빠른 풀스택 개발이 가능합니다",
      "PostgreSQL + Prisma": "타입 안전한 ORM과 강력한 관계형 DB, 안정적인 데이터 관리",
      "PostgreSQL + TypeORM": "데코레이터 기반 ORM, Spring 경험자에게 친숙합니다",
      "MySQL + Prisma": "가장 널리 쓰이는 관계형 DB와 타입 안전 ORM의 조합",
      "Supabase (PostgreSQL)": "호스팅된 PostgreSQL, 인증·스토리지를 한번에 해결합니다",
      "MongoDB + Mongoose": "스키마 유연한 NoSQL, 빠른 프로토타이핑에 적합합니다",
      "Firebase Firestore": "실시간 동기화 내장 NoSQL, 서버 없이 시작할 수 있습니다",
      "PlanetScale + Prisma": "서버리스 MySQL, 브랜치 기반 스키마 관리가 특징입니다",
      "NextAuth.js": "Next.js와 완벽 통합, 소셜 로그인 구현이 가장 쉽습니다",
      "Clerk": "완성도 높은 인증 UI 컴포넌트, 설정 최소화로 빠른 구현 가능",
      "JWT 직접 구현": "커스터마이징 자유도 최고, 하지만 보안 구현 책임이 따릅니다",
      "Supabase Auth": "Supabase 사용 시 인증까지 한 번에 해결됩니다",
      "Firebase Auth": "Google 기반 인증 서비스, 소셜 로그인과 연동이 쉽습니다",
      "Zustand": "간단하고 직관적인 상태 관리, 보일러플레이트가 거의 없습니다",
      "React Query (TanStack)": "서버 상태 관리 특화, 캐싱·동기화를 자동으로 처리합니다",
      "Jotai": "원자 단위 상태 관리, 재렌더링 최적화가 자연스럽습니다",
      "Redux Toolkit": "대규모 앱의 복잡한 상태 관리에 검증된 솔루션입니다",
      "Recoil": "React 친화적 상태 관리, 비동기 상태 처리가 편리합니다",
    };

    const ARCH_CATEGORY_LABELS: Record<ArchCategory, string> = {
      framework: "Framework",
      styling: "Styling",
      realtime: "Realtime",
      api: "API",
      server: "Server",
      db: "DB/ORM",
      auth: "Auth",
      state: "State",
    };

    const preset = platformType
      ? (PLATFORM_PRESETS as Record<string, (typeof PLATFORM_PRESETS)[PlatformPresetKey]>)[platformType]
      : null;

    const undecidedCategories = ARCHITECTURE_CATEGORIES.filter(
      (cat) => !decidedCategories[cat],
    );
    if (undecidedCategories.length === 0) return null;

    // In single-category mode, only build the card for the target category
    const categoriesToBuild = targetCategory
      ? undecidedCategories.filter((cat) => cat === targetCategory)
      : undecidedCategories;
    if (categoriesToBuild.length === 0) return null;

    return categoriesToBuild.map((cat) => {
      let options: string[];
      let primaryName: string;
      let secondaryName: string;

      if (preset) {
        const stackOpt = (preset.stacks as Record<ArchCategory, { primary: string; secondary: string; options: string[] }>)[cat];
        options = stackOpt.options.slice(0, 4);
        primaryName = stackOpt.primary;
        secondaryName = stackOpt.secondary;
      } else {
        // Generic fallbacks if no preset
        const GENERIC_OPTIONS: Record<ArchCategory, string[]> = {
          framework: ["Next.js", "React (Vite)", "Vue 3 (Nuxt)", "Remix"],
          styling: ["Tailwind CSS", "CSS Modules", "styled-components", "MUI"],
          realtime: ["Socket.io", "SSE", "불필요", "Firebase Realtime DB"],
          api: ["REST", "GraphQL", "tRPC", "REST + WebSocket"],
          server: ["NestJS", "Express", "FastAPI", "Fastify"],
          db: ["PostgreSQL + Prisma", "MySQL + Prisma", "MongoDB + Mongoose", "Supabase (PostgreSQL)"],
          auth: ["NextAuth.js", "Clerk", "JWT 직접 구현", "Firebase Auth"],
          state: ["Zustand", "React Query (TanStack)", "Jotai", "Redux Toolkit"],
        };
        options = GENERIC_OPTIONS[cat];
        primaryName = options[0];
        secondaryName = options[1];
      }

      return {
        category: cat,
        label: ARCH_CATEGORY_LABELS[cat],
        options: options.map((name) => ({
          name,
          reason: OPTION_REASONS[name] ?? "",
          isPrimary: name === primaryName,
        })),
      };
    });
  }

  /** Build platform preset context block for architecture system prompt */
  private _buildPresetContext(platformType: string | null): string {
    if (!platformType) return "";

    // Try exact key match first
    const preset = (PLATFORM_PRESETS as Record<string, (typeof PLATFORM_PRESETS)[PlatformPresetKey]>)[platformType];
    if (!preset) return "";

    const lines = [`\n<platform_preset label="${xmlEscape(preset.label)}">`];
    for (const [cat, opt] of Object.entries(preset.stacks) as [string, { primary: string; secondary: string; options: string[] }][]) {
      lines.push(`  <${cat}>`);
      lines.push(`    <primary>${xmlEscape(opt.primary)}</primary>`);
      lines.push(`    <secondary>${xmlEscape(opt.secondary)}</secondary>`);
      lines.push(`    <options>${opt.options.map(xmlEscape).join(", ")}</options>`);
      lines.push(`  </${cat}>`);
    }
    lines.push(`  <notes>${xmlEscape(preset.notes)}</notes>`);
    lines.push(`</platform_preset>`);
    lines.push(`위 preset은 참고용 기본값입니다. 팀 스킬과 프로젝트 요구사항에 따라 조정하세요.\n`);

    return lines.join("\n");
  }

  /** Seed first assistant message for architecture phase (idempotent). */
  async seedArchitectureChat(userId: string, teamId: string) {
    await this.verifyLeader(userId, teamId);
    const session = await this.getSession(teamId);
    this._assertPhase(session, ["architecture"]);

    // Idempotency: skip if messages already exist
    const existingCount = await this.prisma.kickoffMessage.count({
      where: { sessionId: session.id, phase: "architecture" },
    });
    if (existingCount > 0) return { seeded: false };

    const teamContext = await this._getTeamContext(teamId);
    const brainstormMsgs = await this.prisma.kickoffMessage.findMany({
      where: { sessionId: session.id, phase: "topic_brainstorm" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const brainstormSummary =
      brainstormMsgs.length > 0
        ? brainstormMsgs
            .reverse()
            .map((m) => `${m.role === "user" ? "사용자" : "AI"}: ${m.content.slice(0, 200)}`)
            .join("\n")
        : undefined;

    const features = Array.isArray(session.features) ? (session.features as string[]) : [];
    const complexity = session.complexity ?? "moderate";

    // Compute team level and applicable categories
    const [teamLevel, applicableCategories] = await Promise.all([
      this._computeTeamLevel(teamId),
      Promise.resolve(this._computeApplicableCategories(session.platformType, features)),
    ]);
    const firstCategory = applicableCategories[0] ?? null;

    const seedText = [
      session.topicTitle ? `프로젝트 주제: "${session.topicTitle}"` : "",
      session.platformType ? `플랫폼 유형: ${session.platformType}` : "",
      `복잡도: ${complexity}`,
      features.length > 0 ? `핵심 기능: ${features.join(", ")}` : "",
      firstCategory
        ? `먼저 **${firstCategory.toUpperCase()}** 카테고리부터 추천해줘.`
        : "팀 스킬을 고려해서 아키텍처 스택을 추천해줘.",
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt = this._architectureSystemPrompt(teamContext, session, brainstormSummary, {
      teamLevel,
      applicableCategories,
      confirmedCategories: {},
      currentCategory: firstCategory,
    });
    const aiResponse = await this._callChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: seedText },
    ]);

    const withCards = this._parseOptionCards(aiResponse);
    const withStack = this._parseStackUpdate(withCards.content);
    const cleanedContent = withStack.content;
    const stackUpdate = withStack.stackUpdate;
    // Single-category option card at seed time
    const optionCards =
      withCards.optionCards ??
      (firstCategory
        ? this._buildOptionCards(session.platformType, {}, firstCategory)
        : this._buildOptionCards(session.platformType, {}));
    const mermaidCode = this._extractMermaid(cleanedContent);

    // Save user seed message (visible) + assistant response
    await this.prisma.kickoffMessage.create({
      data: { sessionId: session.id, role: "user", content: seedText, phase: "architecture" },
    });
    const savedMsg = await this.prisma.kickoffMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: cleanedContent,
        mermaidCode,
        phase: "architecture",
      },
    });

    if (mermaidCode) {
      await this.prisma.kickoffSession.update({
        where: { id: session.id },
        data: { mermaidDiagram: mermaidCode },
      });
    }

    // Auto-apply stack update from seed response
    if (stackUpdate) {
      const currentArch = (session.architecture as Record<string, string> | null) ?? {};
      const merged = { ...stackUpdate, ...currentArch }; // don't overwrite existing
      await this.prisma.kickoffSession.update({
        where: { id: session.id },
        data: { architecture: merged as object },
      });
    }

    this.realtime.emitToTeam(teamId, "kickoff:chat_updated", { phase: "architecture" });

    return {
      seeded: true,
      applicableCategories,
      teamLevel,
      message: {
        id: savedMsg.id,
        role: "assistant",
        content: cleanedContent,
        mermaidCode,
        createdAt: savedMsg.createdAt.toISOString(),
        stackUpdate,
        optionCards,
      },
    };
  }

  /** Return applicable categories and team level without seeding (for page refresh). */
  async getArchitecturePlan(teamId: string) {
    const session = await this.getSession(teamId);
    const features = Array.isArray(session.features) ? (session.features as string[]) : [];
    const [teamLevel, applicableCategories] = await Promise.all([
      this._computeTeamLevel(teamId),
      Promise.resolve(this._computeApplicableCategories(session.platformType, features)),
    ]);
    return { applicableCategories, teamLevel };
  }

  // ============== Private: Batch C AI 생성 헬퍼 ==============

  private async _generateFirstIssues(
    sess: { topicTitle: string | null; topicDescription: string | null; successCriteria: unknown; architecture: unknown },
    teamCtx: { members: Array<{ userId: string; name: string; role: string }> },
  ): Promise<object> {
    if (!this.openai) return { version: 1, issues: [] };

    const membersText = teamCtx.members
      .map((m) => `- ${xmlEscape(m.name)} (${m.role})`)
      .join("\n");
    const criteriaText = Array.isArray(sess.successCriteria)
      ? (sess.successCriteria as string[]).map((c, i) => `${i + 1}. ${xmlEscape(c)}`).join("\n")
      : "미입력";

    const prompt = `<task>팀 프로젝트 킥오프 직후 실행 가능한 첫 번째 GitHub Issue 3~5개를 생성해주세요.</task>
<project>
  <title>${xmlEscape(sess.topicTitle ?? "")}</title>
  <description>${xmlEscape(sess.topicDescription ?? "")}</description>
  <success_criteria>${criteriaText}</success_criteria>
</project>
<team_members>
${membersText}
</team_members>
<constraints>
- 첫 주 안에 실행 가능한 단위만
- category는 mvp/infra/design/docs 중 하나
- assigneeUserId는 가능한 경우 팀원 userId로 (모르면 null)
- estimatedHours는 1~8 사이
</constraints>
<output_schema>
JSON only, no markdown:
{"version":1,"issues":[{"title":"...","description":"...","category":"mvp","assigneeUserId":null,"estimatedHours":3}]}
</output_schema>`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });
        const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
        if (Array.isArray(parsed.issues)) return parsed;
      } catch (e) {
        this.logger.warn(`_generateFirstIssues attempt ${attempt + 1} failed: ${e}`);
      }
    }
    return { version: 1, issues: [] };
  }

  private async _generateFirstAgenda(
    sess: { topicTitle: string | null; successCriteria: unknown },
    teamCtx: { members: Array<{ userId: string; name: string; role: string }> },
  ): Promise<object> {
    if (!this.openai) return { version: 1, meetingTitle: "첫 번째 팀 회의", totalMinutes: 60, items: [] };

    const criteriaText = Array.isArray(sess.successCriteria)
      ? (sess.successCriteria as string[]).map((c, i) => `${i + 1}. ${xmlEscape(c)}`).join("\n")
      : "미입력";

    const prompt = `<task>킥오프 직후 열리는 첫 번째 팀 회의의 안건(agenda)을 생성해주세요.</task>
<project><title>${xmlEscape(sess.topicTitle ?? "")}</title></project>
<success_criteria>${criteriaText}</success_criteria>
<constraints>
- 총 60분 이내
- 안건 4~6개
- 각 안건에 담당자(owner)와 소요 시간 포함
</constraints>
<output_schema>
JSON only:
{"version":1,"meetingTitle":"...","totalMinutes":60,"items":[{"order":1,"title":"...","durationMinutes":10,"description":"...","owner":"..."}]}
</output_schema>`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });
        const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
        if (Array.isArray(parsed.items)) return parsed;
      } catch (e) {
        this.logger.warn(`_generateFirstAgenda attempt ${attempt + 1} failed: ${e}`);
      }
    }
    return { version: 1, meetingTitle: "첫 번째 팀 회의", totalMinutes: 60, items: [] };
  }

  private async _generateMiniAdrs(
    sess: { topicTitle: string | null; architecture: unknown },
  ): Promise<object> {
    if (!this.openai) return { version: 1, adrs: [] };

    const archText = sess.architecture
      ? JSON.stringify(sess.architecture, null, 2)
      : "미결정";

    const prompt = `<task>프로젝트 기술 스택 선택에 대한 Mini ADR(Architecture Decision Record) 1~3개를 생성해주세요.</task>
<project><title>${xmlEscape(sess.topicTitle ?? "")}</title></project>
<architecture>${xmlEscape(archText)}</architecture>
<constraints>
- 가장 중요한 결정 1~3개만
- 선택 이유와 검토했지만 기각한 대안 포함
</constraints>
<output_schema>
JSON only:
{"version":1,"adrs":[{"title":"...","decision":"...","rationale":"...","alternatives":["..."]}]}
</output_schema>`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });
        const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
        if (Array.isArray(parsed.adrs)) return parsed;
      } catch (e) {
        this.logger.warn(`_generateMiniAdrs attempt ${attempt + 1} failed: ${e}`);
      }
    }
    return { version: 1, adrs: [] };
  }
}
