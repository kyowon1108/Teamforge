import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import type { ExchangeTokenPayload } from '@teamforge/contracts';
import { TeamsService } from './teams.service';
import { CreateTeamSchema } from './dto/create-team.dto';
import { JoinTeamSchema } from './dto/join-team.dto';

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
   * GET /api/teams/me
   * 내 팀 정보 조회
   */
  @Get('me')
  async getMyTeam(@CurrentUser() user: ExchangeTokenPayload) {
    return this.teamsService.getMyTeam(user.sub);
  }
}
