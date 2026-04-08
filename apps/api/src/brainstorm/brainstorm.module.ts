import { Module } from '@nestjs/common';
import { BrainstormController } from './brainstorm.controller';
import { BrainstormService } from './brainstorm.service';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [GatewaysModule],
  controllers: [BrainstormController],
  providers: [BrainstormService],
  exports: [BrainstormService],
})
export class BrainstormModule {}
