import { Injectable } from '@nestjs/common';

/**
 * exchange token의 jti(JWT ID) 재사용을 방지하는 인메모리 캐시.
 * 단일 인스턴스에서만 동작하며, 장기적으로는 KF-005에 따라 Redis로 교체한다.
 */
@Injectable()
export class JtiCacheService {
  private readonly seen = new Map<string, number>(); // jti → exp (unix sec)

  isUsed(jti: string): boolean {
    this.evictExpired();
    return this.seen.has(jti);
  }

  markUsed(jti: string, exp: number): void {
    this.seen.set(jti, exp);
  }

  private evictExpired(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [jti, exp] of this.seen) {
      if (exp <= now) this.seen.delete(jti);
    }
  }
}
