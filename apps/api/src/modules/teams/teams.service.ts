import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  GoneException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTeamDto } from "./dto/create-team.dto";

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTeamDto) {
    // Check for duplicate team name by same leader
    const existing = await this.prisma.team.findFirst({
      where: { name: dto.name, leaderUserId: userId, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({ code: "TEAM_NAME_DUPLICATE" });
    }

    const inviteCode = this._generateInviteCode();
    const frontendUrl =
      process.env.FRONTEND_URL ?? "http://localhost:3000";

    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        description: dto.description,
        expectedSize: dto.expectedSize,
        leaderUserId: userId,
        inviteCode,
        members: {
          create: {
            userId,
            role: "leader",
            status: "active",
          },
        },
      },
    });

    return {
      team: {
        id: team.id,
        name: team.name,
        inviteCode: team.inviteCode,
        inviteUrl: `${frontendUrl}/team/join/${team.inviteCode}`,
        inviteExpiresAt: team.inviteExpiresAt,
        memberCount: 1,
        leaderUserId: team.leaderUserId,
        expectedSize: team.expectedSize,
      },
    };
  }

  async join(userId: string, inviteCode: string, role?: "member" | "observer") {
    const team = await this.prisma.team.findUnique({
      where: { inviteCode },
      include: { members: { where: { status: "active" } } },
    });

    if (!team || team.deletedAt) {
      throw new NotFoundException({ code: "INVITE_CODE_NOT_FOUND" });
    }

    if (team.inviteExpiresAt && team.inviteExpiresAt < new Date()) {
      throw new GoneException({ code: "INVITE_CODE_EXPIRED" });
    }

    const existingMembership = team.members.find((m) => m.userId === userId);
    if (existingMembership) {
      throw new ConflictException({ code: "ALREADY_TEAM_MEMBER" });
    }

    if (team.members.length >= team.expectedSize) {
      throw new ForbiddenException({ code: "TEAM_FULL" });
    }

    const assignedRole = role === "observer" ? "observer" : "member";

    await this.prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId,
        role: assignedRole,
        status: "active",
      },
    });

    const frontendUrl =
      process.env.FRONTEND_URL ?? "http://localhost:3000";

    return {
      team: {
        id: team.id,
        name: team.name,
        inviteCode: team.inviteCode,
        inviteUrl: `${frontendUrl}/team/join/${team.inviteCode}`,
        inviteExpiresAt: team.inviteExpiresAt,
        memberCount: team.members.length + 1,
        leaderUserId: team.leaderUserId,
        expectedSize: team.expectedSize,
      },
      role: assignedRole,
    };
  }

  async getTeam(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId, deletedAt: null },
      include: { members: { where: { status: "active" } } },
    });
    if (!team) throw new NotFoundException("Team not found");

    const frontendUrl =
      process.env.FRONTEND_URL ?? "http://localhost:3000";

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      inviteCode: team.inviteCode,
      inviteUrl: `${frontendUrl}/team/join/${team.inviteCode}`,
      inviteExpiresAt: team.inviteExpiresAt,
      memberCount: team.members.length,
      leaderUserId: team.leaderUserId,
      expectedSize: team.expectedSize,
    };
  }

  async getMembers(teamId: string) {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId, status: "active" },
      include: { user: true },
    });

    // Check survey completion
    const assessments = await this.prisma.skillAssessment.findMany({
      where: { teamId, status: "completed" },
      select: { userId: true },
    });
    const completedSet = new Set(assessments.map((a) => a.userId));

    return members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      surveyCompleted: completedSet.has(m.userId),
    }));
  }

  async getDashboard(teamId: string, viewerUserId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId, deletedAt: null },
      include: { members: { where: { status: "active" }, include: { user: true } } },
    });
    if (!team) throw new NotFoundException("Team not found");

    const viewerMember = team.members.find((m) => m.userId === viewerUserId);
    if (!viewerMember) throw new ForbiddenException("Not a team member");

    const viewerRole = viewerMember.role;

    // Phase 1: leader-only dashboard — non-leaders get restricted response
    if (viewerRole !== "leader") {
      return {
        team: { id: team.id, name: team.name, description: team.description, expectedSize: team.expectedSize },
        viewerRole,
        restricted: true,
        dashboardStatus: "restricted" as const,
      };
    }

    // Get all completed assessments
    const assessments = await this.prisma.skillAssessment.findMany({
      where: { teamId, status: "completed" },
    });

    // Fetch skill vectors via raw SQL
    const rawVectors = await this.prisma.$queryRaw<{ user_id: string; skill_vector: string }[]>`
      SELECT user_id, skill_vector::text FROM skill_assessments
      WHERE team_id = ${teamId}::uuid AND status = 'completed' AND skill_vector IS NOT NULL
    `;
    const vectorMap = new Map<string, number[]>();
    for (const rv of rawVectors) {
      const nums = rv.skill_vector.replace(/[\[\]]/g, "").split(",").map(Number);
      vectorMap.set(rv.user_id, nums);
    }

    const completedSet = new Set(assessments.map((a) => a.userId));
    const nonObservers = team.members.filter((m) => m.role !== "observer");
    const completedCount = nonObservers.filter((m) => completedSet.has(m.userId)).length;

    // Dashboard status
    let dashboardStatus: "survey_incomplete" | "partial_ready" | "ready";
    if (completedCount === 0) {
      dashboardStatus = "survey_incomplete";
    } else if (completedCount < nonObservers.length) {
      dashboardStatus = "partial_ready";
    } else {
      dashboardStatus = "ready";
    }

    // Team skill distribution (average of all completed vectors)
    const SKILL_LABELS = ["backend", "frontend", "database", "devops", "aiMl", "design"];
    const teamSkillAvg = [0, 0, 0, 0, 0, 0];
    let vectorCount = 0;
    for (const vec of vectorMap.values()) {
      for (let i = 0; i < 6; i++) teamSkillAvg[i] += vec[i] ?? 0;
      vectorCount++;
    }
    if (vectorCount > 0) {
      for (let i = 0; i < 6; i++) teamSkillAvg[i] /= vectorCount;
    }

    const teamSkillDistribution = Object.fromEntries(
      SKILL_LABELS.map((label, i) => [label, Math.round(teamSkillAvg[i] * 100) / 100])
    );

    // Strengths & weaknesses
    const sorted = SKILL_LABELS.map((l, i) => ({ label: l, value: teamSkillAvg[i] }))
      .sort((a, b) => b.value - a.value);
    const strengths = sorted.filter((s) => s.value > 0).slice(0, 2).map((s) => s.label);
    const weaknesses = sorted.filter((s) => s.value >= 0).reverse().slice(0, 2)
      .filter((s) => s.value < 3).map((s) => s.label);

    // Role recommendations (simple: highest individual score per domain)
    const roleRecommendations = this._buildRoleRecommendations(team.members, vectorMap, assessments);

    // Member summaries (role-based access)
    const memberSummaries = team.members.map((m) => {
      const assessment = assessments.find((a) => a.userId === m.userId);
      const vector = vectorMap.get(m.userId);

      const base = {
        userId: m.userId,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        surveyCompleted: completedSet.has(m.userId),
      };

      // Leader: include full skill vector + scores
      return {
        ...base,
        skillVector: vector
          ? Object.fromEntries(SKILL_LABELS.map((l, i) => [l, vector[i] ?? 0]))
          : null,
        experienceScore: assessment?.experienceScore ?? null,
        reliabilityScore: assessment?.reliabilityScore ?? null,
      };
    });

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

    return {
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        expectedSize: team.expectedSize,
        inviteCode: viewerRole === "leader" ? team.inviteCode : undefined,
        inviteUrl: viewerRole === "leader"
          ? `${frontendUrl}/team/join/${team.inviteCode}`
          : undefined,
      },
      dashboardStatus,
      progress: {
        total: nonObservers.length,
        completed: completedCount,
      },
      teamSkillDistribution,
      strengths,
      weaknesses,
      roleRecommendations,
      members: memberSummaries,
      viewerRole,
    };
  }

  private _buildRoleRecommendations(
    members: Array<{ userId: string; user: { name: string | null } }>,
    vectorMap: Map<string, number[]>,
    assessments: Array<{ userId: string; answers: unknown }>
  ) {
    const ROLES = [
      { role: "백엔드 개발자", index: 0 },
      { role: "프론트엔드 개발자", index: 1 },
      { role: "데이터 엔지니어", index: 2 },
      { role: "DevOps 엔지니어", index: 3 },
      { role: "AI 엔지니어", index: 4 },
      { role: "디자이너", index: 5 },
    ];

    return ROLES.map(({ role, index }) => {
      const candidates = members
        .filter((m) => vectorMap.has(m.userId))
        .map((m) => ({
          userId: m.userId,
          name: m.user.name,
          score: vectorMap.get(m.userId)?.[index] ?? 0,
          desired: this._wantsRole(assessments, m.userId, role),
        }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score);

      return {
        role,
        topCandidate: candidates[0] ?? null,
        candidates: candidates.slice(0, 3),
      };
    }).filter((r) => r.topCandidate !== null);
  }

  private _wantsRole(
    assessments: Array<{ userId: string; answers: unknown }>,
    userId: string,
    role: string
  ): boolean {
    const assessment = assessments.find((a) => a.userId === userId);
    if (!assessment) return false;
    const answers = assessment.answers as Record<string, unknown>;
    const desired = (answers.desiredRoles ?? []) as string[];
    // Map Korean role name to desired role keywords
    const mapping: Record<string, string[]> = {
      "백엔드 개발자": ["백엔드 개발"],
      "프론트엔드 개발자": ["프론트엔드 개발"],
      "데이터 엔지니어": ["데이터"],
      "DevOps 엔지니어": ["DevOps/인프라"],
      "AI 엔지니어": ["AI/ML"],
      "디자이너": ["디자인", "UI/UX"],
    };
    const keywords = mapping[role] ?? [];
    return desired.some((d) => keywords.some((k) => d.includes(k)));
  }

  private _generateInviteCode(): string {
    return Math.random().toString().slice(2, 8);
  }
}
