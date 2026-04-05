import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TeamsModule } from "./modules/teams/teams.module";
import { SurveyModule } from "./modules/survey/survey.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { MeetingsModule } from "./modules/meetings/meetings.module";
import { EventsModule } from "./modules/events/events.module";
import { KickoffModule } from "./modules/kickoff/kickoff.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TeamsModule,
    SurveyModule,
    RealtimeModule,
    MeetingsModule,
    EventsModule,
    KickoffModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
