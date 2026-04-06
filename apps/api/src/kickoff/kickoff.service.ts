import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KickoffService {
  constructor(private readonly prisma: PrismaService) {}

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

    // 설문 응답 조회 (observer 제외 대상자들의 제출 여부)
    const surveyableUserIds = memberships
      .filter((m) => m.role !== 'observer')
      .map((m) => m.userId);

    const surveyResponses = await this.prisma.surveyResponse.findMany({
      where: {
        teamId,
        userId: { in: surveyableUserIds },
      },
      select: { userId: true, submitted: true },
    });

    const submittedSet = new Set(
      surveyResponses.filter((r) => r.submitted).map((r) => r.userId),
    );

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
      // observer는 submitted 값을 null로 표시
      submitted: m.role === 'observer' ? null : submittedSet.has(m.userId),
      image: m.user.image,
    }));

    return {
      phase,
      surveyStats: {
        total,
        submitted,
        canProceed,
      },
      members,
      myRole,
    };
  }
}
