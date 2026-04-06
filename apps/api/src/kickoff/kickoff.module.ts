import { Module } from '@nestjs/common';
import { KickoffService } from './kickoff.service';
import { KickoffController } from './kickoff.controller';

@Module({
  controllers: [KickoffController],
  providers: [KickoffService],
  exports: [KickoffService],
})
export class KickoffModule {}
