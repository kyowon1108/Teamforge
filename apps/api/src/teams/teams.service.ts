import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTeamDto } from './dto/create-team.dto';
import type { JoinTeamDto } from './dto/join-team.dto';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTeam(
    userId: string,
    dto: CreateTeamDto,
  ): Promise<{ teamId: string; inviteCode: string }> {
    // 이미 팀에 속해있는지 확인
    const existing = await this.prisma.teamMembership.findFirst({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_IN_TEAM',
        message: '이미 팀에 속해있습니다',
      });
    }

    // 고유한 inviteCode 생성 (충돌 재시도 최대 5회)
    let inviteCode = generateInviteCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const taken = await this.prisma.team.findUnique({ where: { inviteCode } });
      if (!taken) break;
      if (attempt === 4) {
        // 마지막 시도도 충돌 — 이론상 극히 드물지만 안전 처리
        inviteCode = generateInviteCode();
      } else {
        inviteCode = generateInviteCode();
      }
    }

    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        inviteCode,
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
    // 이미 팀에 속해있는지 확인
    const existing = await this.prisma.teamMembership.findFirst({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_IN_TEAM',
        message: '이미 팀에 속해있습니다',
      });
    }

    const team = await this.prisma.team.findUnique({
      where: { inviteCode: dto.inviteCode },
    });

    if (!team) {
      throw new NotFoundException({
        code: 'TEAM_NOT_FOUND',
        message: '초대 코드가 유효하지 않습니다',
      });
    }

    // 이미 해당 팀에 속해있는지 중복 체크
    const membershipExists = await this.prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId: team.id, userId } },
    });

    if (membershipExists) {
      throw new ConflictException({
        code: 'ALREADY_MEMBER',
        message: '이미 해당 팀의 멤버입니다',
      });
    }

    await this.prisma.teamMembership.create({
      data: {
        teamId: team.id,
        userId,
        role: dto.role,
      },
    });

    return { teamId: team.id };
  }

  async getMyTeam(userId: string) {
    const membership = await this.prisma.teamMembership.findFirst({
      where: { userId },
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
      // inviteCode는 leader만 조회 가능 (observer/member가 무단 초대 방지)
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
}
