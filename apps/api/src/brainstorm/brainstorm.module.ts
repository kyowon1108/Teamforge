import { Module } from '@nestjs/common';
import { BrainstormController } from './brainstorm.controller';
import { BrainstormService } from './brainstorm.service';

@Module({
  controllers: [BrainstormController],
  providers: [BrainstormService],
  exports: [BrainstormService],
})
export class BrainstormModule {}
