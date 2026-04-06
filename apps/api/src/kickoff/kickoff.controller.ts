import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { ExchangeTokenPayload } from '@teamforge/contracts';
import { KickoffService } from './kickoff.service';
import { ParseTeamIdPipe } from '../common/parse-team-id.pipe';

@Controller('teams/:teamId/kickoff')
export class KickoffController {
  constructor(private readonly kickoffService: KickoffService) {}

  /**
   * GET /api/teams/:teamId/kickoff/status
   * Screen 6 — 팀 킥오프 현황 (설문 진행률, 멤버 목록)
   * 팀 멤버 전체 접근 가능 (observer 포함)
   */
  @Get('status')
  async getKickoffStatus(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
  ) {
    return this.kickoffService.getKickoffStatus(teamId, user.sub);
  }
}
