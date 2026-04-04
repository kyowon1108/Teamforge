import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TeamsModule } from "./modules/teams/teams.module";
import { SurveyModule } from "./modules/survey/survey.module";
import { RealtimeModule } from "./realtime/realtime.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TeamsModule,
    SurveyModule,
    RealtimeModule,
  ],
})
export class AppModule {}
