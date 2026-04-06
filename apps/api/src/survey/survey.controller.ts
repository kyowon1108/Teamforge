import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { ExchangeTokenPayload } from '@teamforge/contracts';
import { SurveyService } from './survey.service';
import { SaveDraftDto } from './dto/save-draft.dto';

@UseGuards(JwtAuthGuard)
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
    @Param('teamId') teamId: string,
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
    @Param('teamId') teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
  ) {
    return this.surveyService.getMyResponse(teamId, user.sub);
  }

  /**
   * POST /api/teams/:teamId/survey/submit
   * Screen 4 — 최종 제출
   */
  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  async submitSurvey(
    @Param('teamId') teamId: string,
    @CurrentUser() user: ExchangeTokenPayload,
    @Body() body: unknown,
  ) {
    const dto = this.parseSaveDraftBody(body);
    return this.surveyService.submitSurvey(teamId, user.sub, dto);
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
}
