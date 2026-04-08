import { Module } from '@nestjs/common';
import { KickoffService } from './kickoff.service';
import { KickoffController, TopicController } from './kickoff.controller';
import { BrainstormModule } from '../brainstorm/brainstorm.module';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [BrainstormModule, GatewaysModule],
  controllers: [KickoffController, TopicController],
  providers: [KickoffService],
  exports: [KickoffService],
})
export class KickoffModule {}
