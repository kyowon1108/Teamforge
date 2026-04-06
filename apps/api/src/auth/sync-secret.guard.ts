import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * POST /api/auth/sync 전용 가드.
 * X-Sync-Secret 헤더와 SYNC_INTERNAL_SECRET 환경변수를 비교해
 * Next.js 서버(BFF)에서만 호출 가능하도록 제한한다.
 */
@Injectable()
export class SyncSecretGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const provided = req.headers['x-sync-secret'];
    const expected = process.env.SYNC_INTERNAL_SECRET;

    if (!expected) {
      throw new UnauthorizedException('SYNC_INTERNAL_SECRET not configured');
    }
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid sync secret');
    }
    return true;
  }
}
