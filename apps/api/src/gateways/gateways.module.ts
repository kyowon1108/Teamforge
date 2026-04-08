import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TeamGateway } from './team.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.WS_TOKEN_SECRET ?? process.env.JWT_SECRET,
    }),
  ],
  providers: [TeamGateway],
  exports: [TeamGateway],
})
export class GatewaysModule {}
