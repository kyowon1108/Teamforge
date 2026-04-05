import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { SessionExchangeDto } from "./dto/session-exchange.dto";
import * as crypto from "crypto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly events: EventsService,
  ) {}

  async sessionExchange(dto: SessionExchangeDto) {
    const { user: oauthUser } = dto;

    // Upsert user
    let user = await this.prisma.user.findUnique({
      where: { email: oauthUser.email },
    });

    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: oauthUser.email,
          name: oauthUser.name,
          avatarUrl: oauthUser.image ?? null,
          githubUrl:
            oauthUser.provider === "github"
              ? `https://github.com/${oauthUser.name}`
              : null,
        },
      });
    } else {
      // Update avatar/name if changed
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: oauthUser.name,
          avatarUrl: oauthUser.image ?? user.avatarUrl,
        },
      });
    }

    // Upsert auth_account record
    if (oauthUser.provider && oauthUser.providerAccountId) {
      await this.prisma.authAccount.upsert({
        where: {
          provider_providerId: {
            provider: oauthUser.provider,
            providerId: oauthUser.providerAccountId,
          },
        },
        create: {
          userId: user.id,
          provider: oauthUser.provider,
          providerId: oauthUser.providerAccountId,
        },
        update: {},
      });
    }

    // Check if user has a team
    const membership = await this.prisma.teamMember.findFirst({
      where: { userId: user.id, status: "active" },
      include: { team: true },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      teamId: membership?.teamId ?? null,
      teamRole: membership?.role ?? null,
    };

    const accessToken = this.jwt.sign(payload, { expiresIn: "15m" });
    const refreshToken = this._generateRefreshToken(user.id);

    this.events.track("login_success", {
      userId: user.id,
      metadata: { isNewUser, provider: oauthUser.provider ?? "unknown" },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        githubUrl: user.githubUrl,
        isNewUser,
        teamId: membership?.teamId ?? null,
        teamRole: membership?.role ?? null,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    // Return most recently joined active team
    const membership = await this.prisma.teamMember.findFirst({
      where: { userId, status: "active" },
      include: { team: true },
      orderBy: { joinedAt: "desc" },
    });

    // Check survey completion status
    let surveyStatus: string | null = null;
    if (membership) {
      const assessment = await this.prisma.skillAssessment.findUnique({
        where: { userId_teamId: { userId, teamId: membership.teamId } },
        select: { status: true },
      });
      surveyStatus = assessment?.status ?? null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      teamId: membership?.teamId ?? null,
      teamRole: membership?.role ?? null,
      teamName: membership?.team?.name ?? null,
      surveyStatus,
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwt.verify(token) as Record<string, unknown>;

      if (payload.type !== "refresh") {
        throw new UnauthorizedException({ code: "REFRESH_TOKEN_EXPIRED" });
      }

      const userId = payload.sub as string;
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException({ code: "REFRESH_TOKEN_EXPIRED" });
      }

      const membership = await this.prisma.teamMember.findFirst({
        where: { userId: user.id, status: "active" },
      });

      const newPayload = {
        sub: user.id,
        email: user.email,
        teamId: membership?.teamId ?? null,
        teamRole: membership?.role ?? null,
      };

      // Rotate refresh token on each use
      return {
        accessToken: this.jwt.sign(newPayload, { expiresIn: "15m" }),
        refreshToken: this._generateRefreshToken(user.id),
      };
    } catch {
      throw new UnauthorizedException({ code: "REFRESH_TOKEN_EXPIRED" });
    }
  }

  private _generateRefreshToken(userId: string): string {
    return this.jwt.sign({ sub: userId, type: "refresh" }, { expiresIn: "7d" });
  }
}
