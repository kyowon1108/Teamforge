import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { Public } from './public.decorator';
import { SyncSecretGuard } from './sync-secret.guard';
import { AuthService } from './auth.service';

const SyncUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  image: z.string().url().optional(),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
