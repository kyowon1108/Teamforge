import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MeetingsController } from "./meetings.controller";
import { MeetingsService } from "./meetings.service";
import { RealtimeModule } from "../../realtime/realtime.module";

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
