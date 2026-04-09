import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTeamDto } from './dto/create-team.dto';
import type { JoinTeamDto } from './dto/join-team.dto';

/** 한 팀에 가입 가능한 최대 인원 */
const MAX_MEMBERS_PER_TEAM = 30;
/** 한 유저가 생성할 수 있는 최대 팀 수 */
const MAX_TEAMS_PER_USER = 10;

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTeam(
    userId: string,
    dto: CreateTeamDto,
  ): Promise<{ teamId: string; inviteCode: string }> {
    // 유저당 팀 생성 수 제한
    const ownedCount = await this.prisma.teamMembership.count({
      where: { userId, role: 'leader' },
    });
    if (ownedCount >= MAX_TEAMS_PER_USER) {
      throw new ForbiddenException({
        code: 'TEAM_LIMIT_REACHED',
        message: `팀은 최대 ${MAX_TEAMS_PER_USER}개까지 생성할 수 있습니다`,
      });
    }

    // 고유한 inviteCode 생성 (충돌 재시도 최대 5회)
    let inviteCode = generateInviteCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const taken = await this.prisma.team.findUnique({ where: { inviteCode } });
      if (!taken) break;
      inviteCode = generateInviteCode();
    }

    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        inviteCode,
        teamType: dto.teamType ?? null,
        projectDuration: dto.projectDuration ?? null,
        completionTarget: dto.completionTarget ?? null,
        hasNonDeveloper: dto.hasNonDeveloper ?? null,
        usesVibeCoding: dto.usesVibeCoding ?? null,
        hasSkillGap: dto.hasSkillGap ?? null,
        domainHints: dto.domainHints ?? [],
        memberships: {
          create: {
            userId,
            role: 'leader',
          },
        },
      },
    });

    return { teamId: team.id, inviteCode: team.inviteCode };
  }

  async joinTeam(
    userId: string,
    dto: JoinTeamDto,
  ): Promise<{ teamId: string }> {
    const team = await this.prisma.team.findUnique({
      where: { inviteCode: dto.inviteCode },
      include: { _count: { select: { memberships: true } } },
    });

    if (!team) {
      throw new NotFoundException({
        code: 'TEAM_NOT_FOUND',
        message: '초대 코드가 유효하지 않습니다',
      });
    }

    // 팀 멤버 수 상한 체크
    if (team._count.memberships >= MAX_MEMBERS_PER_TEAM) {
      throw new ForbiddenException({
        code: 'TEAM_FULL',
        message: `팀은 최대 ${MAX_MEMBERS_PER_TEAM}명까지 참가할 수 있습니다`,
      });
    }

    // Race-condition safe: try-catch로 Unique violation 처리
    try {
      await this.prisma.teamMembership.create({
        data: {
          teamId: team.id,
          userId,
          role: dto.role,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'ALREADY_MEMBER',
          message: '이미 해당 팀의 멤버입니다',
        });
      }
      throw error;
    }

    return { teamId: team.id };
  }

  async getMyTeams(userId: string) {
    const memberships = await this.prisma.teamMembership.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            _count: { select: { memberships: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      teamId: m.team.id,
      name: m.team.name,
      role: m.role,
      memberCount: m.team._count.memberships,
      inviteCode: m.role === 'leader' ? m.team.inviteCode : undefined,
      createdAt: m.team.createdAt,
    }));
  }

  async getMyTeam(userId: string) {
    // 다중 팀 환경에서도 동작하도록 첫 번째 팀 대신 모든 팀을 getMyTeams로 안내
    // 하위 호환을 위해 기존 동작 유지하되, 여러 팀이 있을 경우 가장 최근에 활동한 팀 반환
    const membership = await this.prisma.teamMembership.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        team: {
          include: {
            memberships: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException({
        code: 'TEAM_NOT_FOUND',
        message: '소속된 팀을 찾을 수 없습니다',
      });
    }

    const { team } = membership;

    return {
      teamId: team.id,
      name: team.name,
      inviteCode: membership.role === 'leader' ? team.inviteCode : undefined,
      myRole: membership.role,
      members: team.memberships.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
      })),
    };
  }

  /**
   * POST /api/teams/:teamId/regenerate-invite
   * 초대코드 재생성 (leader only) — 기존 코드 무효화
   */
  async regenerateInviteCode(
    teamId: string,
    userId: string,
  ): Promise<{ inviteCode: string }> {
    const membership = await this.prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership) {
      throw new NotFoundException({
        code: 'MEMBERSHIP_NOT_FOUND',
        message: '해당 팀의 멤버가 아닙니다',
      });
    }

    if (membership.role !== 'leader') {
      throw new ForbiddenException({
        code: 'LEADER_ONLY',
        message: '팀장만 초대코드를 재생성할 수 있습니다',
      });
    }

    let inviteCode = generateInviteCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const taken = await this.prisma.team.findUnique({ where: { inviteCode } });
      if (!taken) break;
      inviteCode = generateInviteCode();
    }

    await this.prisma.team.update({
      where: { id: teamId },
      data: { inviteCode },
    });

    return { inviteCode };
  }

  /**
   * POST /api/teams/:teamId/transfer-leadership
   * 리더 양도
   */
  async transferLeadership(
    teamId: string,
    currentLeaderId: string,
    newLeaderId: string,
  ): Promise<{ success: true }> {
    const currentMembership = await this.prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId: currentLeaderId } },
    });

    if (!currentMembership || currentMembership.role !== 'leader') {
      throw new ForbiddenException({
        code: 'LEADER_ONLY',
        message: '팀장만 리더를 양도할 수 있습니다',
      });
    }

    if (currentLeaderId === newLeaderId) {
      throw new ConflictException({
        code: 'SAME_USER',
        message: '자기 자신에게 리더를 양도할 수 없습니다',
      });
    }

    const targetMembership = await this.prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId: newLeaderId } },
    });

    if (!targetMembership) {
      throw new NotFoundException({
        code: 'MEMBERSHIP_NOT_FOUND',
        message: '양도 대상이 팀 멤버가 아닙니다',
      });
    }

    if (targetMembership.role === 'observer') {
      throw new ForbiddenException({
        code: 'OBSERVER_FORBIDDEN',
        message: '옵저버에게 리더를 양도할 수 없습니다',
      });
    }

    // 트랜잭션으로 양도 실행
    await this.prisma.$transaction([
      this.prisma.teamMembership.update({
        where: { teamId_userId: { teamId, userId: currentLeaderId } },
        data: { role: 'member' },
      }),
      this.prisma.teamMembership.update({
        where: { teamId_userId: { teamId, userId: newLeaderId } },
        data: { role: 'leader' },
      }),
    ]);

    return { success: true };
  }

  /**
   * POST /api/teams/:teamId/leave
   * 팀 탈퇴. 리더가 유일한 경우 양도 필수, 마지막 멤버면 팀 삭제.
   */
  async leaveTeam(
    teamId: string,
    userId: string,
  ): Promise<{ success: true; teamDeleted: boolean }> {
    const membership = await this.prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership) {
      throw new NotFoundException({
        code: 'MEMBERSHIP_NOT_FOUND',
        message: '해당 팀의 멤버가 아닙니다',
      });
    }

    const memberCount = await this.prisma.teamMembership.count({
      where: { teamId },
    });

    // 마지막 멤버 → 팀 전체 삭제 (cascade)
    if (memberCount === 1) {
      await this.prisma.team.delete({ where: { id: teamId } });
      return { success: true, teamDeleted: true };
    }

    // 리더가 탈퇴하려면 다른 리더가 있어야 함
    if (membership.role === 'leader') {
      const otherLeaders = await this.prisma.teamMembership.count({
        where: { teamId, role: 'leader', userId: { not: userId } },
      });

      if (otherLeaders === 0) {
        throw new ForbiddenException({
          code: 'LAST_LEADER',
          message: '팀의 유일한 리더는 탈퇴할 수 없습니다. 먼저 다른 멤버에게 리더를 양도하세요.',
        });
      }
    }

    // 멤버십 삭제 + 관련 설문 응답도 삭제
    await this.prisma.$transaction([
      this.prisma.surveyResponse.deleteMany({
        where: { teamId, userId },
      }),
      this.prisma.teamMembership.delete({
        where: { teamId_userId: { teamId, userId } },
      }),
    ]);

    return { success: true, teamDeleted: false };
  }
}
