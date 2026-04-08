import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';
import type { ExchangeTokenPayload } from '@teamforge/contracts';
import { Public } from './public.decorator';
import { SyncSecretGuard } from './sync-secret.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';

const SyncUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  image: z.string().url().optional(),
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * POST /api/auth/sync
   * NextAuth 로그인 성공 후 FE에서 호출 — 인증 불필요.
   * email 기반으로 User를 upsert한다.
   */
  @Public()
  @UseGuards(SyncSecretGuard)
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncUser(@Body() body: unknown) {
    const parsed = SyncUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        code: 'INVALID_SYNC_DATA',
        message: '유저 동기화 데이터가 올바르지 않습니다',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    return this.authService.syncUser(parsed.data);
  }

  /**
   * GET /api/auth/ws-token
   * WebSocket connection short-lived token (30s expiry).
   * Requires valid JWT (global JwtAuthGuard).
   */
  @Get('ws-token')
  async getWsToken(@CurrentUser() user: ExchangeTokenPayload) {
    const token = this.jwtService.sign(
      { sub: user.sub },
      {
        secret: process.env.WS_TOKEN_SECRET ?? process.env.JWT_SECRET,
        expiresIn: '30s',
      },
    );
    return { token };
  }
}
