import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { IntegrationsService } from "./integrations.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest {
  user: { userId: string; email: string; teamId: string | null; teamRole: string | null };
}

@Controller("integrations")
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get(":teamId")
  listIntegrations(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
  ) {
    return this.integrationsService.listIntegrations(req.user.userId, teamId);
  }

  @Post(":teamId/webhook")
  @HttpCode(HttpStatus.OK)
  connectWebhook(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
    @Body() body: { tool: string; webhookUrl: string; meta?: Record<string, unknown> },
  ) {
    if (!body.tool?.trim()) {
      throw new BadRequestException("tool 파라미터가 필요합니다.");
    }
    if (!body.webhookUrl?.trim()) {
      throw new BadRequestException("webhookUrl 파라미터가 필요합니다.");
    }
    return this.integrationsService.connectWebhook(
      req.user.userId,
      teamId,
      body.tool,
      body.webhookUrl,
      body.meta,
    );
  }

  @Delete(":teamId/:tool")
  @HttpCode(HttpStatus.OK)
  disconnect(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
    @Param("tool") tool: string,
  ) {
    return this.integrationsService.disconnect(req.user.userId, teamId, tool);
  }

  @Post(":teamId/:tool/test")
  @HttpCode(HttpStatus.OK)
  testWebhook(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string,
    @Param("tool") tool: string,
  ) {
    return this.integrationsService.testWebhook(req.user.userId, teamId, tool);
  }
}
