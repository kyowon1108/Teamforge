import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { KickoffService } from "./kickoff.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest {
  user: {
    userId: string;
    email: string;
    teamId: string | null;
    teamRole: string | null;
  };
}

@Controller("kickoff")
@UseGuards(JwtAuthGuard)
export class KickoffController {
  constructor(private readonly kickoffService: KickoffService) {}

  @Post("start")
  @HttpCode(HttpStatus.CREATED)
  async start(
    @Request() req: AuthRequest,
    @Body() body: { teamId: string },
  ) {
    // JWT의 teamId와 body.teamId 일치 검증 (cross-team access 방어)
    if (req.user.teamId && req.user.teamId !== body.teamId) {
      throw new BadRequestException("요청한 팀과 소속된 팀이 일치하지 않습니다.");
    }
    return this.kickoffService.startSession(req.user.userId, body.teamId);
  }

  @Get(":teamId")
  async getSession(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
  ) {
    await this.kickoffService.verifyMember(req.user.userId, teamId);
    return this.kickoffService.getSession(teamId);
  }

  @Post(":teamId/topic/direct")
  @HttpCode(HttpStatus.OK)
  async setTopicDirect(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
    @Body() body: { title: string; description: string; platformType?: string },
  ) {
    if (!body.title?.trim()) {
      throw new BadRequestException("프로젝트 제목을 입력해주세요.");
    }
    if (!body.description?.trim() || body.description.trim().length < 10) {
      throw new BadRequestException("프로젝트 설명은 10자 이상이어야 합니다.");
    }
    return this.kickoffService.setTopicDirect(req.user.userId, teamId, body);
  }

  @Post(":teamId/topic/confirm")
  @HttpCode(HttpStatus.OK)
  async confirmTopicFromChat(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
    @Body() body: { title: string; description: string },
  ) {
    if (!body.title?.trim()) {
      throw new BadRequestException("프로젝트 제목을 입력해주세요.");
    }
    return this.kickoffService.confirmTopicFromChat(
      req.user.userId,
      teamId,
      body,
    );
  }

  @Post(":teamId/chat")
  @HttpCode(HttpStatus.OK)
  async chat(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
    @Body()
    body: {
      message: string;
      phase: "topic_brainstorm" | "architecture";
    },
  ) {
    if (!body.message?.trim()) {
      throw new BadRequestException("메시지를 입력해주세요.");
    }
    if (!["topic_brainstorm", "architecture"].includes(body.phase)) {
      throw new BadRequestException("올바르지 않은 phase입니다.");
    }
    return this.kickoffService.chatBrainstorm(
      req.user.userId,
      teamId,
      body.message,
      body.phase,
    );
  }

  @Get(":teamId/chat/:phase")
  async getChatHistory(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
    @Param("phase") phase: string,
  ) {
    await this.kickoffService.verifyMember(req.user.userId, teamId);
    if (!["topic_brainstorm", "architecture"].includes(phase)) {
      throw new BadRequestException("올바르지 않은 phase입니다.");
    }
    return this.kickoffService.getChatHistory(
      teamId,
      phase as "topic_brainstorm" | "architecture",
    );
  }

  // #15: Reset chat for a phase
  @Delete(":teamId/chat/:phase")
  @HttpCode(HttpStatus.OK)
  async resetChat(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
    @Param("phase") phase: string,
  ) {
    if (!["topic_brainstorm", "architecture"].includes(phase)) {
      throw new BadRequestException("올바르지 않은 phase입니다.");
    }
    return this.kickoffService.resetChat(
      req.user.userId,
      teamId,
      phase as "topic_brainstorm" | "architecture",
    );
  }

  @Post(":teamId/revert-to-topic")
  @HttpCode(HttpStatus.OK)
  async revertToTopic(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
  ) {
    return this.kickoffService.revertToTopicPhase(req.user.userId, teamId);
  }

  @Get(":teamId/architecture/plan")
  async getArchitecturePlan(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
  ) {
    await this.kickoffService.verifyMember(req.user.userId, teamId);
    return this.kickoffService.getArchitecturePlan(teamId);
  }

  @Post(":teamId/architecture/seed")
  @HttpCode(HttpStatus.OK)
  async seedArchitecture(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
  ) {
    return this.kickoffService.seedArchitectureChat(req.user.userId, teamId);
  }

  @Post(":teamId/architecture")
  @HttpCode(HttpStatus.OK)
  async saveArchitecture(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
    @Body() body: { architecture: Record<string, string> },
  ) {
    if (!body.architecture || typeof body.architecture !== "object") {
      throw new BadRequestException("아키텍처 결정을 입력해주세요.");
    }
    return this.kickoffService.saveArchitecture(
      req.user.userId,
      teamId,
      body.architecture,
    );
  }

  @Post(":teamId/finalize")
  @HttpCode(HttpStatus.OK)
  async finalize(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
  ) {
    return this.kickoffService.finalizeKickoff(req.user.userId, teamId);
  }

  @Get(":teamId/summary")
  async getSummary(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
  ) {
    await this.kickoffService.verifyMember(req.user.userId, teamId);
    return this.kickoffService.getSummary(teamId);
  }

  // ============== Batch A: 의사결정 입력 ==============

  @Patch(":teamId/decisions")
  @HttpCode(HttpStatus.OK)
  async saveDecisions(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
    @Body()
    body: {
      outOfScope?: string[];
      successCriteria?: string[];
      collabRules?: {
        branchStrategy: string;
        prRule: string;
        issueRule: string;
        meetingCycle: string;
      };
    },
  ) {
    return this.kickoffService.saveDecisions(req.user.userId, teamId, body);
  }

  @Post(":teamId/concerns")
  @HttpCode(HttpStatus.OK)
  async saveConcerns(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
    @Body() body: { concerns: Array<{ type: string; detail?: string }> },
  ) {
    if (!Array.isArray(body.concerns)) {
      throw new BadRequestException("concerns 배열이 필요합니다.");
    }
    return this.kickoffService.saveConcerns(req.user.userId, teamId, body.concerns);
  }

  // ============== Batch B: 역할 수락/조정 ==============

  @Get(":teamId/participants")
  async getParticipants(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
  ) {
    await this.kickoffService.verifyMember(req.user.userId, teamId);
    return this.kickoffService.getParticipants(teamId);
  }

  @Patch(":teamId/members/:userId/role-status")
  @HttpCode(HttpStatus.OK)
  async updateRoleStatus(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
    @Param("userId") targetUserId: string,
    @Body()
    body: {
      status: "accepted" | "adjustment_requested" | "declined";
      alternativeRole?: string;
    },
  ) {
    if (!["accepted", "adjustment_requested", "declined"].includes(body.status)) {
      throw new BadRequestException("올바르지 않은 status입니다.");
    }
    return this.kickoffService.updateRoleStatus(
      req.user.userId,
      teamId,
      targetUserId,
      body.status,
      body.alternativeRole,
    );
  }

  // ============== Batch C: AI 산출물 생성 ==============

  @Post(":teamId/artifacts/generate")
  @HttpCode(HttpStatus.OK)
  async generateArtifacts(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
  ) {
    return this.kickoffService.generateArtifacts(req.user.userId, teamId);
  }

  @Get(":teamId/artifacts")
  async getArtifacts(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
  ) {
    await this.kickoffService.verifyMember(req.user.userId, teamId);
    return this.kickoffService.getArtifacts(teamId);
  }

  // ============== Batch D: 서명 ==============

  @Post(":teamId/sign")
  @HttpCode(HttpStatus.OK)
  async signSummary(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
  ) {
    return this.kickoffService.signSummary(req.user.userId, teamId);
  }
}
