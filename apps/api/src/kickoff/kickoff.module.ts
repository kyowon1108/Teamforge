import { Module } from '@nestjs/common';
import { KickoffService } from './kickoff.service';
import { KickoffController, TopicController } from './kickoff.controller';
import { BrainstormModule } from '../brainstorm/brainstorm.module';

@Module({
  imports: [BrainstormModule],
  controllers: [KickoffController, TopicController],
  providers: [KickoffService],
  exports: [KickoffService],
})
export class KickoffModule {}
