import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ExchangeTokenPayload } from '@teamforge/contracts';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ExchangeTokenPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: ExchangeTokenPayload }>();
    return request.user;
  },
);
