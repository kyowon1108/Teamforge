import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  Request,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { SessionExchangeDto } from "./dto/session-exchange.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

interface AuthRequest {
  user: { userId: string; email: string; teamId: string | null; teamRole: string | null };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/session-exchange
   * Called by Next.js web after NextAuth completes OAuth.
   * Exchanges NextAuth session data for a TeamForge JWT.
   */
  @Post("session-exchange")
  @HttpCode(HttpStatus.OK)
  async sessionExchange(@Body() dto: SessionExchangeDto) {
    const secret = process.env.SESSION_EXCHANGE_SECRET;
    if (!secret || dto.secret !== secret) {
      throw new UnauthorizedException("Invalid session exchange secret");
    }
    return this.authService.sessionExchange(dto);
  }

  /**
   * POST /auth/refresh
   * Refresh JWT using the refresh token from HttpOnly cookie.
   * For Phase 1 MVP: accept refreshToken in body.
   */
  /**
   * GET /auth/me
   * Returns current user info + active team membership.
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: AuthRequest) {
    return this.authService.getMe(req.user.userId);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }
}
