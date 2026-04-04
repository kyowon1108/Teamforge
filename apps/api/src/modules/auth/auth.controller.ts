import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  Request,
  Res,
} from "@nestjs/common";
import { Response, Request as ExpressRequest } from "express";
import { AuthService } from "./auth.service";
import { SessionExchangeDto } from "./dto/session-exchange.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

const REFRESH_COOKIE = "tf_refresh";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

interface AuthRequest extends ExpressRequest {
  user: { userId: string; email: string; teamId: string | null; teamRole: string | null };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("session-exchange")
  @HttpCode(HttpStatus.OK)
  async sessionExchange(
    @Body() dto: SessionExchangeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const secret = process.env.SESSION_EXCHANGE_SECRET;
    if (!secret || dto.secret !== secret) {
      throw new UnauthorizedException("Invalid session exchange secret");
    }
    const result = await this.authService.sessionExchange(dto);

    // Set refresh token as HttpOnly cookie
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    // Still return refreshToken in body for backward compat during transition
    return result;
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: AuthRequest) {
    return this.authService.getMe(req.user.userId);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request() req: ExpressRequest,
    @Body() body: { refreshToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    // Prefer cookie, fallback to body for backward compat
    const token = req.cookies?.[REFRESH_COOKIE] || body.refreshToken;
    if (!token) {
      throw new UnauthorizedException({ code: "REFRESH_TOKEN_EXPIRED" });
    }

    const result = await this.authService.refreshToken(token);

    // Rotate: issue new refresh token in cookie
    if (result.refreshToken) {
      res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    }

    return { accessToken: result.accessToken };
  }

  @Delete("session")
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
    return {};
  }
}
