import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma';
import { SurveyAnswersSchema, SurveyMetadataSchema } from '@teamforge/contracts';
import type { SurveyAnswers } from '@teamforge/contracts';
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
      // 이미 제출된 경우 200 반환, 내용 수정 없음 (answers 제외하고 반환)
      return { id: existing.id, teamId: existing.teamId, userId: existing.userId, submitted: existing.submitted, submittedAt: existing.submittedAt, updatedAt: existing.updatedAt };
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

    // answers 제외하고 반환 — 최소 권한 원칙
    return { id: record.id, teamId: record.teamId, userId: record.userId, submitted: record.submitted, submittedAt: record.submittedAt, updatedAt: record.updatedAt };
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

    if (!record) return null;
    // metadata(autosavedAt 등 내부 필드) 제외, answers는 draft 복원 목적으로 포함
    const { metadata: _meta, ...safe } = record;
    return safe;
  }

  /**
   * GET /api/teams/:teamId/survey/result/me
   * Screen 5 — 내 설문 결과 (6축 레이더 차트 점수 계산)
   */
  async getMyResult(teamId: string, userId: string) {
    const membership = await this.requireMembership(teamId, userId);

    if (membership.role === 'observer') {
      throw new ForbiddenException({
        code: 'OBSERVER_FORBIDDEN',
        message: '옵저버는 설문 결과를 조회할 수 없습니다',
      });
    }

    const record = await this.prisma.surveyResponse.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!record || !record.submitted) {
      return {
        axisScores: {
          기획력: 0,
          기술력: 0,
          소통력: 0,
          추진력: 0,
          창의력: 0,
          성장력: 0,
        },
        strengths: [],
        growthAreas: [],
        suggestedRole: null,
        myRole: membership.role as 'leader' | 'member',
        submitted: false,
        submittedAt: null,
        roleReaction: null,
        roleReactionNote: null,
      };
    }

    const rawAnswers = record.answers as Record<string, unknown>;
    const parsed = SurveyAnswersSchema.safeParse(rawAnswers);
    const answers: SurveyAnswers = parsed.success ? parsed.data : ({} as SurveyAnswers);

    const resultData = this._extractResultData(answers);

    return {
      ...resultData,
      myRole: membership.role as 'leader' | 'member',
      submitted: record.submitted,
      submittedAt: record.submittedAt?.toISOString() ?? null,
      roleReaction: record.roleReaction ?? null,
      roleReactionNote: record.roleReactionNote ?? null,
    };
  }

  /**
   * GET /api/teams/:teamId/survey/result/:userId
   * Screen 5 — 팀장이 특정 팀원의 결과 열람 (leader only, read-only)
   */
  async getMemberResult(teamId: string, requestingUserId: string, targetUserId: string) {
    const requesterMembership = await this.requireMembership(teamId, requestingUserId);

    if (requesterMembership.role !== 'leader') {
      throw new ForbiddenException({
        code: 'LEADER_ONLY',
        message: '팀장만 팀원의 결과를 열람할 수 있습니다',
      });
    }

    const targetMembership = await this.prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!targetMembership) {
      throw new NotFoundException({
        code: 'MEMBERSHIP_NOT_FOUND',
        message: '해당 팀의 멤버가 아닙니다',
      });
    }

    if (targetMembership.role === 'observer') {
      throw new ForbiddenException({
        code: 'OBSERVER_FORBIDDEN',
        message: '옵저버는 설문 결과 조회 대상이 아닙니다',
      });
    }

    const record = await this.prisma.surveyResponse.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });

    if (!record || !record.submitted) {
      throw new NotFoundException({
        code: 'SURVEY_NOT_SUBMITTED',
        message: '아직 설문을 제출하지 않은 팀원입니다',
      });
    }

    const rawAnswers = record.answers as Record<string, unknown>;
    const parsed = SurveyAnswersSchema.safeParse(rawAnswers);
    const answers: SurveyAnswers = parsed.success ? parsed.data : ({} as SurveyAnswers);

    const resultData = this._extractResultData(answers);
    const targetUser = targetMembership.user;

    return {
      ...resultData,
      targetUserName: targetUser.name ?? targetUser.email,
      submitted: record.submitted,
      submittedAt: record.submittedAt?.toISOString() ?? null,
      roleReaction: record.roleReaction ?? null,
      roleReactionNote: record.roleReactionNote ?? null,
    };
  }

  /**
   * 설문 결과 계산 로직 (getMyResult / getMemberResult 공통)
   */
  private _extractResultData(answers: SurveyAnswers) {
    const axisScores = this.calculateAxisScores(answers);

    const entries = Object.entries(axisScores) as [string, number][];
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const strengths = sorted.slice(0, 2).map(([name]) => name);
    const growthAreas = sorted.slice(-2).map(([name]) => name);

    const archetypeRoleMap: Record<string, string> = {
      initiator: '팀 리더',
      architect: '아키텍트',
      executor: '개발자',
      coordinator: '코디네이터',
      documenter: '문서화 담당',
    };
    const suggestedRole = answers.workArchetype
      ? (archetypeRoleMap[answers.workArchetype] ?? null)
      : null;

    const blockProfile = this._calcBlockProfile(answers);
    const roleGoodFit = this._calcRoleGoodFit(answers.workArchetype, blockProfile.strong);
    const roleAvoid = this._calcRoleAvoid(answers);
    const collabScore = this._calcCollabScore(answers);
    const aiSupportPlan = this._calcAISupportPlan(answers);

    return {
      axisScores,
      strengths,
      growthAreas,
      suggestedRole,
      blockProfile,
      roleGoodFit,
      roleAvoid,
      collabScore,
      aiSupportPlan,
    };
  }

  /**
   * POST /api/teams/:teamId/survey/role-reaction
   * Screen 5 — 추천 역할에 대한 반응 저장 (ok / burden / prefer_other)
   */
  async saveRoleReaction(
    teamId: string,
    userId: string,
    reaction: string,
    note?: string,
  ): Promise<{ roleReaction: string; roleReactionNote: string | null }> {
    await this.requireMembership(teamId, userId);

    const existing = await this.prisma.surveyResponse.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { submitted: true },
    });

    if (!existing?.submitted) {
      throw new ForbiddenException({
        code: 'SURVEY_NOT_SUBMITTED',
        message: '설문을 먼저 제출해야 역할 반응을 남길 수 있습니다',
      });
    }

    const updated = await this.prisma.surveyResponse.update({
      where: { teamId_userId: { teamId, userId } },
      data: { roleReaction: reaction, roleReactionNote: note ?? null },
      select: { roleReaction: true, roleReactionNote: true },
    });

    return { roleReaction: updated.roleReaction!, roleReactionNote: updated.roleReactionNote };
  }

  private calculateAxisScores(answers: SurveyAnswers): {
    기획력: number;
    기술력: number;
    소통력: number;
    추진력: number;
    창의력: number;
    성장력: number;
  } {
    // 기획력
    const backgroundBonusMap: Record<string, number> = {
      cs_major: 40,
      working_dev: 35,
      bootcamp: 25,
      non_major: 15,
      pm_designer: 20,
    };
    const backgroundBonus = answers.backgroundType
      ? (backgroundBonusMap[answers.backgroundType] ?? 0)
      : 0;
    const experienceTier = answers.experienceTier ?? 1;
    const 기획력 = Math.min(100, Math.round((experienceTier / 5) * 60 + backgroundBonus));

    // 기술력
    const techStackCount = answers.techStackList?.length ?? 0;
    const techStackScore = (Math.min(techStackCount, 8) / 8) * 50;
    let skillRatingsScore = 0;
    if (answers.skillRatings && Object.keys(answers.skillRatings).length > 0) {
      const vals = Object.values(answers.skillRatings);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      skillRatingsScore = (avg / 5) * 50;
    } else {
      skillRatingsScore = techStackScore;
    }
    const 기술력 = Math.min(
      100,
      Math.round(
        answers.skillRatings && Object.keys(answers.skillRatings).length > 0
          ? techStackScore + skillRatingsScore
          : techStackScore * 2,
      ),
    );

    // 소통력
    const gitCollabLevel = answers.gitCollabLevel ?? 0;
    const projectCount = answers.projectCount ?? 0;
    const actualRoles = answers.actualRoles ?? [];
    const 소통력 = Math.min(
      100,
      Math.round(
        (gitCollabLevel / 4) * 50 +
          (Math.min(projectCount, 5) / 5) * 30 +
          (actualRoles.length >= 2 ? 20 : 10),
      ),
    );

    // 추진력
    const archetypeScoreMap: Record<string, number> = {
      initiator: 85,
      architect: 75,
      executor: 70,
      coordinator: 65,
      documenter: 55,
    };
    const archetypeBase = answers.workArchetype
      ? (archetypeScoreMap[answers.workArchetype] ?? 60)
      : 60;
    const workStyleVector = answers.workStyleVector ?? [0, 0, 0];
    const workStyleBonus =
      (workStyleVector.reduce((a: number, b: number) => a + b, 0) / 100 / 3) * 15;
    const 추진력 = Math.min(100, Math.round(archetypeBase + workStyleBonus));

    // 창의력
    const freeText = answers.freeText ?? '';
    const 창의력 = Math.min(
      100,
      freeText.length > 0
        ? Math.round((Math.min(freeText.length, 300) / 300) * 60 + 40)
        : 30,
    );

    // 성장력
    const githubUrl = answers.githubUrl ?? '';
    const selfIntro = answers.selfIntro ?? '';
    const 성장력 = Math.min(
      100,
      Math.round(
        (githubUrl.length > 0 ? 40 : 0) +
          (Math.min(selfIntro.length, 300) / 300) * 60,
      ),
    );

    return { 기획력, 기술력, 소통력, 추진력, 창의력, 성장력 };
  }

  private readonly VALID_BLOCKS = new Set([
    'ui', 'api', 'db', 'auth', 'devops', 'testing', 'docs', 'pm', 'data', 'ai_feat', 'realtime',
  ]);

  private _calcBlockProfile(answers: SurveyAnswers): { strong: string[]; weak: string[] } {
    const blockConfidence = answers.blockConfidence as Record<string, string> | undefined;
    if (!blockConfidence) return { strong: [], weak: [] };

    const strong: string[] = [];
    const weak: string[] = [];
    for (const [block, level] of Object.entries(blockConfidence)) {
      if (!this.VALID_BLOCKS.has(block)) continue;
      if (level === 'lead' || level === 'contribute') strong.push(block);
      else if (level === 'learn' || level === 'cant') weak.push(block);
    }
    return { strong: strong.slice(0, 4), weak: weak.slice(0, 4) };
  }

  private _calcRoleGoodFit(workArchetype: string | undefined, strongBlocks: string[]): string[] {
    const roles: string[] = [];
    const archetypeMap: Record<string, string[]> = {
      initiator: ['팀 리더', '기획자'],
      architect: ['아키텍트', '시스템 설계자'],
      executor: ['개발자', '풀스택 엔지니어'],
      coordinator: ['PM', '코디네이터'],
      documenter: ['문서화 담당', '온보딩 관리자'],
    };
    if (workArchetype && archetypeMap[workArchetype]) {
      roles.push(...archetypeMap[workArchetype]!);
    }
    // block-based role additions
    if (strongBlocks.includes('devops') || strongBlocks.includes('auth')) roles.push('인프라 담당');
    if (strongBlocks.includes('ai_feat') || strongBlocks.includes('data')) roles.push('AI/데이터 엔지니어');
    if (strongBlocks.includes('testing')) roles.push('QA 담당');
    // deduplicate
    return [...new Set(roles)].slice(0, 3);
  }

  private _calcRoleAvoid(answers: SurveyAnswers): string[] {
    const blockConfidence = answers.blockConfidence as Record<string, string> | undefined;
    if (!blockConfidence) return [];

    const cantBlocks = Object.entries(blockConfidence)
      .filter(([block, level]) => this.VALID_BLOCKS.has(block) && level === 'cant')
      .map(([block]) => block);

    const avoidRoles: string[] = [];
    if (cantBlocks.includes('devops')) avoidRoles.push('인프라 담당');
    if (cantBlocks.includes('pm')) avoidRoles.push('PM/기획');
    if (cantBlocks.includes('ai_feat') && cantBlocks.includes('data')) avoidRoles.push('AI/데이터 담당');
    if (cantBlocks.includes('testing')) avoidRoles.push('QA 담당');
    if (cantBlocks.includes('docs')) avoidRoles.push('문서화 담당');

    return [...new Set(avoidRoles)].slice(0, 2);
  }

  private _calcCollabScore(answers: SurveyAnswers): number {
    const checklist = answers.collabChecklist as Record<string, boolean> | undefined;
    if (!checklist) return 0;
    return Object.values(checklist).filter(Boolean).length;
  }

  private _calcAISupportPlan(answers: SurveyAnswers): {
    primaryAreas: string[];
    verificationLevel: number;
    autonomousBlocks: string[];
  } | null {
    const aiProfile = answers.aiProfile as {
      preferences?: string[];
      verificationLevel?: number;
      pairComfort?: boolean;
      selfLeadBlocks?: string[];
    } | undefined;

    if (!aiProfile) return null;

    const AI_LABEL_MAP: Record<string, string> = {
      ideation: '아이디어 정리',
      code_draft: '코드 초안',
      debugging: '디버깅',
      docs: '문서 정리',
      review: '코드 리뷰',
      learning: '학습 보조',
    };

    return {
      primaryAreas: (aiProfile.preferences ?? []).map((p) => AI_LABEL_MAP[p] ?? '기타'),
      verificationLevel: aiProfile.verificationLevel ?? 1,
      autonomousBlocks: aiProfile.selfLeadBlocks ?? [],
    };
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
      // 이미 제출 — answers 제외하고 반환
      return { id: existing.id, teamId: existing.teamId, userId: existing.userId, submitted: existing.submitted, submittedAt: existing.submittedAt, updatedAt: existing.updatedAt };
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

    // answers 제외하고 반환 — 최소 권한 원칙
    return { id: record.id, teamId: record.teamId, userId: record.userId, submitted: record.submitted, submittedAt: record.submittedAt, updatedAt: record.updatedAt };
  }
}
