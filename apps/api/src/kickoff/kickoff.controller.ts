import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { ExchangeTokenPayload } from '@teamforge/contracts';
import { KickoffService } from './kickoff.service';
import { ParseTeamIdPipe } from '../common/parse-team-id.pipe';

// ---------------------------------------------------------------------------
// Kickoff status controller (Screen 6)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Topic controller (Screen 7)
// ---------------------------------------------------------------------------

@Controller('teams/:teamId/topic')
export class TopicController {
  constructor(private readonly kickoffService: KickoffService) {}

  /**
   * GET /api/teams/:teamId/topic
   * Screen 7 — AI 주제 조회 또는 생성 트리거
   * - 202: pending | processing (백그라운드 생성 중)
   * - 200: completed (topics 반환) | failed
   */
  @Get()
  async getTopic(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
    @Res() res: Response,
  ) {
    const result = await this.kickoffService.getOrGenerateTopic(
      teamId,
      user.sub,
    );

    if (result.httpStatus === 202) {
      return res.status(202).json({ status: result.status, jobId: result.jobId });
    }

    return res.status(200).json(result);
  }

  /**
   * POST /api/teams/:teamId/topic/react
   * Screen 7 — 주제에 반응 (agree / concern)
   * observer 접근 불가
   */
  @Post('react')
  @HttpCode(HttpStatus.OK)
  async reactToTopic(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    const { topicId, reaction } = this.parseReactBody(body);
    return this.kickoffService.reactToTopic(teamId, user.sub, topicId, reaction);
  }

  /**
   * POST /api/teams/:teamId/topic/confirm
   * Screen 7 — 주제 확정 (팀장 전용)
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirmTopic(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    const { topicId } = this.parseConfirmBody(body);
    return this.kickoffService.confirmTopic(teamId, user.sub, topicId);
  }

  // ---------------------------------------------------------------------------
  // Body validators
  // ---------------------------------------------------------------------------

  private parseReactBody(body: unknown): {
    topicId: string;
    reaction: 'agree' | 'concern';
  } {
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).topicId !== 'string' ||
      !(body as Record<string, unknown>).topicId
    ) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST_BODY',
        message: 'topicId 필드가 필요합니다',
      });
    }

    const raw = body as Record<string, unknown>;
    const topicId = raw.topicId as string;

    if (topicId.length > 50) {
      throw new BadRequestException({
        code: 'INVALID_TOPIC_ID',
        message: 'topicId 형식이 올바르지 않습니다',
      });
    }

    const reaction = raw.reaction;

    if (reaction !== 'agree' && reaction !== 'concern') {
      throw new BadRequestException({
        code: 'INVALID_REACTION',
        message: "reaction은 'agree' 또는 'concern'이어야 합니다",
      });
    }

    return { topicId, reaction };
  }

  private parseConfirmBody(body: unknown): { topicId: string } {
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).topicId !== 'string' ||
      !(body as Record<string, unknown>).topicId
    ) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST_BODY',
        message: 'topicId 필드가 필요합니다',
      });
    }

    const topicId = (body as Record<string, unknown>).topicId as string;

    if (topicId.length > 50) {
      throw new BadRequestException({
        code: 'INVALID_TOPIC_ID',
        message: 'topicId 형식이 올바르지 않습니다',
      });
    }

    return { topicId };
  }
}
