import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const VALID_TOOLS = new Set([
  "slack", "github", "discord", "notion", "linear", "jira",
]);

const MAX_WEBHOOK_URL_LENGTH = 2000;

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyLeader(userId: string, teamId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership || membership.status !== "active") {
      throw new ForbiddenException("팀 멤버가 아닙니다.");
    }
    if (membership.role !== "leader") {
      throw new ForbiddenException("팀장만 연동 설정을 변경할 수 있습니다.");
    }
    return membership;
  }

  private async verifyMember(userId: string, teamId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership || membership.status !== "active") {
      throw new ForbiddenException("팀 멤버가 아닙니다.");
    }
    return membership;
  }

  async listIntegrations(userId: string, teamId: string) {
    await this.verifyMember(userId, teamId);

    const integrations = await this.prisma.integration.findMany({
      where: { teamId },
      orderBy: { tool: "asc" },
    });

    // Return sanitized list (no tokens exposed)
    return integrations.map((i) => ({
      id: i.id,
      tool: i.tool,
      status: i.status,
      meta: i.meta,
      connectedAt: i.connectedAt?.toISOString() ?? null,
      lastUsedAt: i.lastUsedAt?.toISOString() ?? null,
    }));
  }

  async connectWebhook(
    userId: string,
    teamId: string,
    tool: string,
    webhookUrl: string,
    meta?: Record<string, unknown>,
  ) {
    await this.verifyLeader(userId, teamId);

    if (!VALID_TOOLS.has(tool)) {
      throw new BadRequestException(`지원하지 않는 도구입니다: ${tool}`);
    }
    if (!webhookUrl || webhookUrl.trim().length === 0) {
      throw new BadRequestException("Webhook URL을 입력해주세요.");
    }
    if (webhookUrl.length > MAX_WEBHOOK_URL_LENGTH) {
      throw new BadRequestException("Webhook URL이 너무 깁니다.");
    }
    // Basic URL validation
    try {
      const url = new URL(webhookUrl.trim());
      if (!["https:", "http:"].includes(url.protocol)) {
        throw new Error("invalid protocol");
      }
    } catch {
      throw new BadRequestException("올바른 URL 형식이 아닙니다.");
    }

    const integration = await this.prisma.integration.upsert({
      where: { teamId_tool: { teamId, tool } },
      create: {
        teamId,
        tool,
        status: "connected",
        webhookUrl: webhookUrl.trim(),
        meta: (meta ?? {}) as object,
        connectedBy: userId,
        connectedAt: new Date(),
      },
      update: {
        status: "connected",
        webhookUrl: webhookUrl.trim(),
        meta: (meta ?? {}) as object,
        connectedBy: userId,
        connectedAt: new Date(),
      },
    });

    return { id: integration.id, tool: integration.tool, status: integration.status };
  }

  async disconnect(userId: string, teamId: string, tool: string) {
    await this.verifyLeader(userId, teamId);

    if (!VALID_TOOLS.has(tool)) {
      throw new BadRequestException(`지원하지 않는 도구입니다: ${tool}`);
    }

    await this.prisma.integration.updateMany({
      where: { teamId, tool },
      data: {
        status: "disconnected",
        accessToken: null,
        refreshToken: null,
        webhookUrl: null,
        meta: {},
      },
    });

    return { tool, status: "disconnected" };
  }

  async testWebhook(userId: string, teamId: string, tool: string) {
    await this.verifyLeader(userId, teamId);

    const integration = await this.prisma.integration.findUnique({
      where: { teamId_tool: { teamId, tool } },
    });

    if (!integration || integration.status !== "connected" || !integration.webhookUrl) {
      throw new BadRequestException("연동이 설정되지 않았습니다.");
    }

    // Discord webhook test
    if (tool === "discord" && integration.webhookUrl.includes("discord.com/api/webhooks")) {
      try {
        const res = await fetch(integration.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "✅ TeamForge 연동 테스트 메시지입니다!",
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await this.prisma.integration.update({
          where: { id: integration.id },
          data: { lastUsedAt: new Date() },
        });
        return { success: true, message: "Discord에 테스트 메시지를 전송했습니다." };
      } catch {
        await this.prisma.integration.update({
          where: { id: integration.id },
          data: { status: "error" },
        });
        return { success: false, message: "메시지 전송에 실패했습니다. Webhook URL을 확인해주세요." };
      }
    }

    // Generic webhook test (POST with ping payload)
    try {
      const res = await fetch(integration.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ping", source: "teamforge", teamId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { lastUsedAt: new Date() },
      });
      return { success: true, message: "테스트 요청을 전송했습니다." };
    } catch {
      return { success: false, message: "테스트 요청에 실패했습니다." };
    }
  }
}
