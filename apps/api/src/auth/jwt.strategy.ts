import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ExchangeTokenPayloadSchema, type ExchangeTokenPayload } from '@teamforge/contracts';
import { JtiCacheService } from './jti-cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly jtiCache: JtiCacheService) {
    const secret = process.env.SESSION_EXCHANGE_SECRET;
    if (!secret) {
      throw new Error('SESSION_EXCHANGE_SECRET environment variable is not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: 'teamforge-web',
      audience: 'teamforge-api',
    });
  }

  validate(payload: unknown): ExchangeTokenPayload {
    const result = ExchangeTokenPayloadSchema.safeParse(payload);
    if (!result.success) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const now = Math.floor(Date.now() / 1000);

    // exp 상한선: 발급 시각 기준 최대 300s 초과 불가
    if (result.data.exp > now + 300) {
      throw new UnauthorizedException('Token expiry exceeds maximum allowed (300s)');
    }

    // jti 재사용 방지 (인메모리 — KF-005: Redis로 교체 예정)
    if (this.jtiCache.isUsed(result.data.jti)) {
      throw new UnauthorizedException('Token already used (jti replay detected)');
    }
    this.jtiCache.markUsed(result.data.jti, result.data.exp);

    return result.data;
  }
}
