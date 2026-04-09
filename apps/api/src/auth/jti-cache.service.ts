import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

const JTI_PREFIX = 'jti:';

/**
 * exchange token의 jti(JWT ID) 재사용을 방지하는 캐시.
 * Redis가 있으면 Redis 사용, 없으면 인메모리 Map 폴백.
 */
@Injectable()
export class JtiCacheService implements OnModuleInit {
  private readonly memCache = new Map<string, number>(); // jti → exp (unix sec)
  private useRedis = false;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  async onModuleInit() {
    if (this.redis) {
      try {
        await this.redis.connect();
        this.useRedis = true;
      } catch {
        // Redis 연결 실패 → 인메모리 폴백
        this.useRedis = false;
      }
    }
  }

  async isUsed(jti: string): Promise<boolean> {
    if (this.useRedis) {
      const exists = await this.redis!.exists(`${JTI_PREFIX}${jti}`);
      return exists === 1;
    }
    this.evictExpired();
    return this.memCache.has(jti);
  }

  async markUsed(jti: string, exp: number): Promise<void> {
    if (this.useRedis) {
      const ttl = Math.max(exp - Math.floor(Date.now() / 1000), 1);
      await this.redis!.set(`${JTI_PREFIX}${jti}`, '1', 'EX', ttl);
      return;
    }
    this.memCache.set(jti, exp);
  }

  private evictExpired(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [jti, exp] of this.memCache) {
      if (exp <= now) this.memCache.delete(jti);
    }
  }
}
