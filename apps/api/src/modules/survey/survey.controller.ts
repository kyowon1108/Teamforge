import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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

  @Post("upload/resume")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== "application/pdf") {
        cb(new BadRequestException("PDF 파일만 업로드 가능합니다"), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async uploadResume(
    @Request() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { teamId: string }
  ) {
    if (!file) throw new BadRequestException("파일이 필요합니다");
    return this.surveyService.saveResume(req.user.userId, body.teamId, file);
  }
}
