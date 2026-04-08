import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { ExchangeTokenPayload } from '@teamforge/contracts';
import {
  IdeaSubmitBodySchema,
  BuildOnBodySchema,
  IdeaReactBodySchema,
} from '@teamforge/contracts';
import { BrainstormService } from './brainstorm.service';
import { ParseTeamIdPipe } from '../common/parse-team-id.pipe';

@Controller('teams/:teamId/brainstorm')
export class BrainstormController {
  constructor(private readonly brainstormService: BrainstormService) {}

  /**
   * GET /api/teams/:teamId/brainstorm
   * Session overview (upsert on first access)
   */
  @Get()
  async getSession(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
  ) {
    return this.brainstormService.getOrCreateSession(teamId, user.sub);
  }

  /**
   * POST /api/teams/:teamId/brainstorm/ideas
   * Submit a new original idea
   */
  @Post('ideas')
  @HttpCode(HttpStatus.CREATED)
  async submitIdea(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    const parsed = IdeaSubmitBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_BODY',
        message: 'title(1-30자), description(1-100자)이 필요합니다',
      });
    }
    return this.brainstormService.submitIdea(teamId, user.sub, parsed.data);
  }

  /**
   * POST /api/teams/:teamId/brainstorm/ideas/:ideaId/build-on
   * Build on an existing idea
   */
  @Post('ideas/:ideaId/build-on')
  @HttpCode(HttpStatus.CREATED)
  async buildOn(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @Param('ideaId', ParseTeamIdPipe) ideaId: string,
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    const parsed = BuildOnBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_BODY',
        message: 'title(1-30자), description(1-100자)이 필요합니다',
      });
    }
    return this.brainstormService.buildOnIdea(teamId, user.sub, ideaId, parsed.data);
  }

  /**
   * POST /api/teams/:teamId/brainstorm/ideas/:ideaId/react
   * React to an idea (like / comment)
   */
  @Post('ideas/:ideaId/react')
  @HttpCode(HttpStatus.OK)
  async react(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @Param('ideaId', ParseTeamIdPipe) ideaId: string,
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    const parsed = IdeaReactBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_BODY',
        message: "type('like'|'comment')이 필요합니다. comment일 때 content(최대 50자) 필수",
      });
    }
    return this.brainstormService.reactToIdea(teamId, user.sub, ideaId, parsed.data);
  }

  /**
   * POST /api/teams/:teamId/brainstorm/advance
   * Advance brainstorm phase (leader only)
   */
  @Post('advance')
  @HttpCode(HttpStatus.OK)
  async advancePhase(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
  ) {
    return this.brainstormService.advancePhase(teamId, user.sub);
  }

  /**
   * GET /api/teams/:teamId/brainstorm/ideas
   * Polling endpoint for idea list
   */
  @Get('ideas')
  async getIdeas(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
  ) {
    return this.brainstormService.getIdeas(teamId, user.sub);
  }
}
