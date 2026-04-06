import { Module } from '@nestjs/common';
import { KickoffService } from './kickoff.service';
import { KickoffController, TopicController } from './kickoff.controller';

@Module({
  controllers: [KickoffController, TopicController],
  providers: [KickoffService],
  exports: [KickoffService],
})
export class KickoffModule {}
