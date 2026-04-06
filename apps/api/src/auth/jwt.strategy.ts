import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ExchangeTokenPayloadSchema, type ExchangeTokenPayload } from '@teamforge/contracts';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
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
    // exp 상한선 검증: 발급 시각 기준 최대 5분(300s) 초과 불가
    const now = Math.floor(Date.now() / 1000);
    if (result.data.exp > now + 300) {
      throw new UnauthorizedException('Token expiry exceeds maximum allowed (300s)');
    }
    // TODO: jti 재사용 방지 — Redis CacheModule 도입 후 구현 (KF-005 참고)
    // jti를 TTL=300s로 캐시에 저장하고 중복 사용 시 UnauthorizedException
    return result.data;
  }
}
