import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { KickoffController } from "./kickoff.controller";
import { KickoffService } from "./kickoff.service";
import { RealtimeModule } from "../../realtime/realtime.module";

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [KickoffController],
  providers: [KickoffService],
  exports: [KickoffService],
})
export class KickoffModule {}
