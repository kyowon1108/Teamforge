// NextAuth(web) → NestJS(api) 세션 교환 토큰 클레임 계약
// SESSION_EXCHANGE_SECRET으로 서명된 단기(5분) JWT

import { z } from 'zod';

export const ExchangeTokenPayloadSchema = z.object({
  sub: z.string().uuid(),        // userId
  email: z.string().email(),
  role: z.enum(['leader', 'member', 'observer']).optional(),
  teamId: z.string().uuid().optional(),
  jti: z.string().uuid(),        // 1회성 nonce
  iss: z.literal('teamforge-web'),
  aud: z.literal('teamforge-api'),
  exp: z.number(),               // Unix timestamp, max now+300s
});

export type ExchangeTokenPayload = z.infer<typeof ExchangeTokenPayloadSchema>;
