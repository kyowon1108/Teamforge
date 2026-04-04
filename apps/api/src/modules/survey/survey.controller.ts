import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { SurveyService } from "./survey.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest {
  user: { userId: string; email: string; teamId: string | null; teamRole: string | null };
}

@Controller("survey")
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  @Post("draft")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  saveDraft(
    @Request() req: AuthRequest,
    @Body() body: { teamId: string; section: number; answers: Record<string, unknown> }
  ) {
    return this.surveyService.saveDraft(req.user.userId, body);
  }

  @Post("submit")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  submit(
    @Request() req: AuthRequest,
    @Body() body: { teamId: string; answers: Record<string, unknown> }
  ) {
    return this.surveyService.submit(req.user.userId, body);
  }

  @Get("result-status/:jobId")
  async resultStatus(
    @Param("jobId") jobId: string,
    @Res() res: Response
  ) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    await this.surveyService.streamResultStatus(jobId, res);
  }

  @Get("result/:userId/:teamId")
  @UseGuards(JwtAuthGuard)
  getResult(
    @Request() req: AuthRequest,
    @Param("userId") userId: string,
    @Param("teamId") teamId: string
  ) {
    // Only allow users to view their own results
    if (req.user.userId !== userId) {
      return null;
    }
    return this.surveyService.getResult(userId, teamId);
  }
}
