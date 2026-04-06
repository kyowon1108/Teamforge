import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SyncUserDto {
  email: string;
  name?: string;
  image?: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * NextAuth 로그인 성공 후 FE에서 호출.
   * email 기반으로 User를 upsert한다.
   * - 없으면 생성
   * - 있으면 name / image 업데이트
   */
  async syncUser(dto: SyncUserDto): Promise<{ userId: string; created: boolean }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.user.update({
        where: { email: dto.email },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.image !== undefined && { image: dto.image }),
        },
      });
      return { userId: existing.id, created: false };
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name ?? null,
        image: dto.image ?? null,
      },
      select: { id: true },
    });
    return { userId: user.id, created: true };
  }
}
