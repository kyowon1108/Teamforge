import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateTeamDto } from "./dto/create-team.dto";
import { JoinTeamDto } from "./dto/join-team.dto";

interface AuthRequest {
  user: { userId: string; email: string; teamId: string | null; teamRole: string | null };
}

@Controller("teams")
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: AuthRequest, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(req.user.userId, dto);
  }

  @Post("join")
  @HttpCode(HttpStatus.OK)
  join(@Request() req: AuthRequest, @Body() dto: JoinTeamDto) {
    return this.teamsService.join(req.user.userId, dto.inviteCode, dto.role);
  }

  @Get(":teamId")
  getTeam(@Param("teamId") teamId: string) {
    return this.teamsService.getTeam(teamId);
  }

  @Get(":teamId/members")
  getMembers(@Param("teamId") teamId: string) {
    return this.teamsService.getMembers(teamId);
  }

  @Get(":teamId/dashboard")
  getDashboard(@Request() req: AuthRequest, @Param("teamId") teamId: string) {
    return this.teamsService.getDashboard(teamId, req.user.userId);
  }
}
