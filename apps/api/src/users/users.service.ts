import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TeamRole } from '@teamforge/contracts';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다' });
    }

    return user;
  }

  /**
   * Screen 2 — 역할 선택
   *
   * User 모델에 role 필드가 없으므로 선택된 역할을 확인(acknowledge)만 한다.
   * 실제 role 저장은 팀 생성(leader) 또는 팀 참가(member/observer) 시
   * TeamMembership.role 에 저장된다.
   *
   * 프론트엔드는 응답받은 role 값을 로컬 상태로 유지하여
   * POST /teams 또는 POST /teams/join 요청 시 함께 전달한다.
   */
  async acknowledgeRole(userId: string, role: TeamRole): Promise<{ success: true; role: TeamRole }> {
    // 사용자 존재 여부만 검증
    await this.findById(userId);
    return { success: true, role };
  }
}
