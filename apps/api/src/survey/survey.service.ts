import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma';
import { SurveyAnswersSchema, SurveyMetadataSchema } from '@teamforge/contracts';
import type { SaveDraftDto } from './dto/save-draft.dto';

@Injectable()
export class SurveyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * TeamMembership 존재 여부 확인 — 없으면 NotFoundException
   * 반환: membership row (role 포함)
   */
  private async requireMembership(teamId: string, userId: string) {
    const membership = await this.prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership) {
      throw new NotFoundException({
        code: 'MEMBERSHIP_NOT_FOUND',
        message: '해당 팀의 멤버가 아닙니다',
      });
    }

    return membership;
  }

  /**
   * POST /api/teams/:teamId/survey/draft
   * 자동저장 (upsert). 이미 submitted=true면 기존 레코드를 그대로 반환 (덮어쓰기 금지).
   */
  async saveDraft(teamId: string, userId: string, dto: SaveDraftDto) {
    const membership = await this.requireMembership(teamId, userId);

    if (membership.role === 'observer') {
      throw new ForbiddenException({
        code: 'OBSERVER_FORBIDDEN',
        message: '옵저버는 설문에 응답할 수 없습니다',
      });
    }

    // answers Zod 검증
    const answersParsed = SurveyAnswersSchema.safeParse(dto.answers);
    if (!answersParsed.success) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ANSWERS',
        message: '설문 답변 형식이 올바르지 않습니다',
        errors: answersParsed.error.flatten().fieldErrors,
      });
    }

    // metadata Zod 검증 (선택)
    let metadataValue: Prisma.InputJsonValue | undefined;
    if (dto.metadata !== undefined) {
      const metaParsed = SurveyMetadataSchema.safeParse(dto.metadata);
      if (!metaParsed.success) {
        throw new UnprocessableEntityException({
          code: 'INVALID_METADATA',
          message: '메타데이터 형식이 올바르지 않습니다',
          errors: metaParsed.error.flatten().fieldErrors,
        });
      }
      metadataValue = metaParsed.data as Prisma.InputJsonValue;
    }

    // 기존 레코드 확인 — submitted=true 이면 덮어쓰기 금지
    const existing = await this.prisma.surveyResponse.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (existing?.submitted) {
      // 이미 제출된 경우 200 반환, 내용 수정 없음
      return existing;
    }

    const autosavedAt = new Date().toISOString();
    const finalMetadata: Prisma.InputJsonValue = {
      ...(typeof metadataValue === 'object' && metadataValue !== null && !Array.isArray(metadataValue)
        ? (metadataValue as Record<string, unknown>)
        : {}),
      autosavedAt,
    };

    const answersJson = answersParsed.data as Prisma.InputJsonValue;

    const record = await this.prisma.surveyResponse.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: {
        teamId,
        userId,
        answers: answersJson,
        metadata: finalMetadata,
        submitted: false,
      },
      update: {
        answers: answersJson,
        metadata: finalMetadata,
      },
    });

    return record;
  }

  /**
   * GET /api/teams/:teamId/survey/me
   * 내 draft 불러오기. 레코드 없으면 null 반환.
   */
  async getMyResponse(teamId: string, userId: string) {
    await this.requireMembership(teamId, userId);

    const record = await this.prisma.surveyResponse.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    return record ?? null;
  }

  /**
   * POST /api/teams/:teamId/survey/submit
   * 최종 제출. submitted=true, submittedAt=now() 설정.
   */
  async submitSurvey(teamId: string, userId: string, dto: SaveDraftDto) {
    const membership = await this.requireMembership(teamId, userId);

    if (membership.role === 'observer') {
      throw new ForbiddenException({
        code: 'OBSERVER_FORBIDDEN',
        message: '옵저버는 설문에 응답할 수 없습니다',
      });
    }

    // answers Zod 검증
    const answersParsed = SurveyAnswersSchema.safeParse(dto.answers);
    if (!answersParsed.success) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ANSWERS',
        message: '설문 답변 형식이 올바르지 않습니다',
        errors: answersParsed.error.flatten().fieldErrors,
      });
    }

    // metadata Zod 검증 (선택)
    let metadataValue: Prisma.InputJsonValue | undefined;
    if (dto.metadata !== undefined) {
      const metaParsed = SurveyMetadataSchema.safeParse(dto.metadata);
      if (!metaParsed.success) {
        throw new UnprocessableEntityException({
          code: 'INVALID_METADATA',
          message: '메타데이터 형식이 올바르지 않습니다',
          errors: metaParsed.error.flatten().fieldErrors,
        });
      }
      metadataValue = metaParsed.data as Prisma.InputJsonValue;
    }

    // 이미 제출된 경우 덮어쓰기 금지
    const existing = await this.prisma.surveyResponse.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existing?.submitted) {
      return existing;
    }

    const submittedAt = new Date();
    const answersJson = answersParsed.data as Prisma.InputJsonValue;

    const record = await this.prisma.surveyResponse.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: {
        teamId,
        userId,
        answers: answersJson,
        ...(metadataValue !== undefined ? { metadata: metadataValue } : {}),
        submitted: true,
        submittedAt,
      },
      update: {
        answers: answersJson,
        ...(metadataValue !== undefined ? { metadata: metadataValue } : {}),
        submitted: true,
        submittedAt,
      },
    });

    return record;
  }
}
