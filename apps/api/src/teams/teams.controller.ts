import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import type { ExchangeTokenPayload } from '@teamforge/contracts';
import { TeamsService } from './teams.service';
import { CreateTeamSchema } from './dto/create-team.dto';
import { JoinTeamSchema } from './dto/join-team.dto';
import { ParseTeamIdPipe } from '../common/parse-team-id.pipe';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * POST /api/teams
   * Screen 3a — 팀 생성 (leader)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTeam(
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    const parsed = CreateTeamSchema.safeParse(body);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        code: 'INVALID_TEAM_DATA',
        message: '팀 정보가 올바르지 않습니다',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    return this.teamsService.createTeam(user.sub, parsed.data);
  }

  /**
   * POST /api/teams/join
   * Screen 3b — 팀 참가 (member | observer)
   * 초대코드 브루트포스 방지: 5분 내 5회 제한
   */
  @Throttle({ default: { ttl: 300_000, limit: 5 } })
  @Post('join')
  @HttpCode(HttpStatus.OK)
  async joinTeam(
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    const parsed = JoinTeamSchema.safeParse(body);
    if (!parsed.success) {
      throw new UnprocessableEntityException({
        code: 'INVALID_JOIN_DATA',
        message: '참가 정보가 올바르지 않습니다',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    return this.teamsService.joinTeam(user.sub, parsed.data);
  }

  /**
   * GET /api/teams
   * 현재 로그인 유저의 모든 활성 팀 목록 반환
   */
  @Get()
  async getMyTeams(@CurrentUser() user: ExchangeTokenPayload) {
    return this.teamsService.getMyTeams(user.sub);
  }

  /**
   * GET /api/teams/me
   * 내 팀 정보 조회 (가장 최근 활동한 팀)
   */
  @Get('me')
  async getMyTeam(@CurrentUser() user: ExchangeTokenPayload) {
    return this.teamsService.getMyTeam(user.sub);
  }

  /**
   * POST /api/teams/:teamId/regenerate-invite
   * 초대코드 재생성 (leader only)
   */
  @Post(':teamId/regenerate-invite')
  @HttpCode(HttpStatus.OK)
  async regenerateInviteCode(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
  ) {
    return this.teamsService.regenerateInviteCode(teamId, user.sub);
  }

  /**
   * POST /api/teams/:teamId/transfer-leadership
   * 리더 양도 (leader only)
   */
  @Post(':teamId/transfer-leadership')
  @HttpCode(HttpStatus.OK)
  async transferLeadership(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).targetUserId !== 'string'
    ) {
      throw new BadRequestException({
        code: 'INVALID_BODY',
        message: 'targetUserId 필드가 필요합니다',
      });
    }
    const targetUserId = (body as Record<string, unknown>).targetUserId as string;
    return this.teamsService.transferLeadership(teamId, user.sub, targetUserId);
  }

  /**
   * POST /api/teams/:teamId/leave
   * 팀 탈퇴
   */
  @Post(':teamId/leave')
  @HttpCode(HttpStatus.OK)
  async leaveTeam(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
  ) {
    return this.teamsService.leaveTeam(teamId, user.sub);
  }
}
