import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { MeetingsService } from "./meetings.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface AuthRequest {
  user: { userId: string; email: string; teamId: string | null; teamRole: string | null };
}

@Controller("meetings")
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: AuthRequest,
    @Body() body: { teamId: string; title?: string; rawContent: string; meetingDate?: string }
  ) {
    if (!body.rawContent || body.rawContent.trim().length < 50) {
      throw new BadRequestException("회의 내용은 최소 50자 이상이어야 합니다.");
    }

    // Verify user is leader or member (not observer)
    const membership = await this.meetingsService.verifyMembership(req.user.userId, body.teamId);
    if (membership.role === "observer") {
      throw new ForbiddenException("옵저버는 회의를 생성할 수 없습니다.");
    }

    return this.meetingsService.createMeeting(req.user.userId, body);
  }

  @Get("team/:teamId")
  async listByTeam(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string
  ) {
    const membership = await this.meetingsService.verifyMembership(req.user.userId, teamId);
    return this.meetingsService.listMeetings(teamId, membership.role);
  }

  @Get(":meetingId")
  async getDetail(
    @Request() req: AuthRequest,
    @Param("meetingId") meetingId: string
  ) {
    const meeting = await this.meetingsService.getMeetingDetail(meetingId);
    const membership = await this.meetingsService.verifyMembership(req.user.userId, meeting.teamId);

    // Observer: strip raw content
    if (membership.role === "observer") {
      return { ...meeting, rawContent: null };
    }
    return meeting;
  }

  @Patch("action-items/:actionItemId/toggle")
  @HttpCode(HttpStatus.OK)
  async toggleActionItem(
    @Request() req: AuthRequest,
    @Param("actionItemId") actionItemId: string
  ) {
    const item = await this.meetingsService.getActionItem(actionItemId);
    const membership = await this.meetingsService.verifyMembership(req.user.userId, item.teamId);

    // Observer cannot toggle
    if (membership.role === "observer") {
      throw new ForbiddenException("옵저버는 액션 아이템을 수정할 수 없습니다.");
    }

    return this.meetingsService.toggleActionItem(actionItemId);
  }

  @Get("team/:teamId/open-actions")
  async getOpenActions(
    @Request() req: AuthRequest,
    @Param("teamId") teamId: string
  ) {
    await this.meetingsService.verifyMembership(req.user.userId, teamId);
    return this.meetingsService.getOpenActionItems(teamId);
  }
}
