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
import { CurrentUser } from '../auth/current-user.decorator';
import type { ExchangeTokenPayload } from '@teamforge/contracts';
import { SurveyService } from './survey.service';
import { SaveDraftDto } from './dto/save-draft.dto';
import { ParseTeamIdPipe } from '../common/parse-team-id.pipe';

@Controller('teams/:teamId/survey')
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  /**
   * POST /api/teams/:teamId/survey/draft
   * Screen 4 — 자동저장 (upsert)
   * 이미 submitted=true 이면 200 반환, 덮어쓰기 없음
   */
  @Post('draft')
  @HttpCode(HttpStatus.OK)
  async saveDraft(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    const dto = this.parseSaveDraftBody(body);
    return this.surveyService.saveDraft(teamId, user.sub, dto);
  }

  /**
   * GET /api/teams/:teamId/survey/me
   * Screen 4 — 내 draft 불러오기
   */
  @Get('me')
  async getMyResponse(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
  ) {
    return this.surveyService.getMyResponse(teamId, user.sub);
  }

  /**
   * GET /api/teams/:teamId/survey/result/me
   * Screen 5 — 내 설문 결과 (레이더 차트 6축 점수)
   */
  @Get('result/me')
  async getMyResult(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
  ) {
    return this.surveyService.getMyResult(teamId, user.sub);
  }

  /**
   * POST /api/teams/:teamId/survey/submit
   * Screen 4 — 최종 제출
   */
  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  async submitSurvey(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    const dto = this.parseSaveDraftBody(body);
    return this.surveyService.submitSurvey(teamId, user.sub, dto);
  }

  /**
   * POST /api/teams/:teamId/survey/role-reaction
   * Screen 5 — 추천 역할에 대한 반응 저장 (ok / burden / prefer_other)
   */
  @Post('role-reaction')
  @HttpCode(HttpStatus.OK)
  async saveRoleReaction(
    @Param('teamId', ParseTeamIdPipe) teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    const { reaction, note } = this.parseRoleReactionBody(body);
    return this.surveyService.saveRoleReaction(teamId, user.sub, reaction, note);
  }

  /**
   * body를 SaveDraftDto 형태로 검증하는 헬퍼.
   * answers 필드가 object인지만 확인하고, 세부 Zod 검증은 Service 에서 수행.
   */
  private parseSaveDraftBody(body: unknown): SaveDraftDto {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('answers' in body) ||
      typeof (body as Record<string, unknown>).answers !== 'object' ||
      (body as Record<string, unknown>).answers === null
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_REQUEST_BODY',
        message: 'answers 필드가 필요합니다',
      });
    }

    const raw = body as Record<string, unknown>;
    const dto = new SaveDraftDto();
    dto.answers = raw.answers as Record<string, unknown>;
    if (raw.metadata !== undefined) {
      dto.metadata = raw.metadata as SaveDraftDto['metadata'];
    }
    return dto;
  }

  private parseRoleReactionBody(body: unknown): { reaction: string; note?: string } {
    if (typeof body !== 'object' || body === null) {
      throw new UnprocessableEntityException({ code: 'INVALID_REQUEST_BODY', message: '요청 형식이 올바르지 않습니다' });
    }
    const raw = body as Record<string, unknown>;
    const reaction = raw.reaction;
    if (reaction !== 'ok' && reaction !== 'burden' && reaction !== 'prefer_other') {
      throw new BadRequestException({ code: 'INVALID_REACTION', message: "reaction은 'ok', 'burden', 'prefer_other' 중 하나여야 합니다" });
    }
    const note = raw.note;
    if (note !== undefined && (typeof note !== 'string' || note.length > 100)) {
      throw new BadRequestException({ code: 'INVALID_NOTE', message: 'note는 최대 100자 문자열입니다' });
    }
    return { reaction, note: typeof note === 'string' ? note : undefined };
  }
}
