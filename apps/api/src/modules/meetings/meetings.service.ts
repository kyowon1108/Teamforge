import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { EventsService } from "../events/events.service";
import OpenAI from "openai";

interface ActionItemParsed {
  description: string;
  assigneeName: string | null;
  dueDate: string | null;
}

interface MeetingAnalysis {
  summary: string;
  actionItems: ActionItemParsed[];
  nextAgenda: string[];
}

@Injectable()
export class MeetingsService {
  private openai: OpenAI | null;

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private events: EventsService,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async verifyMembership(userId: string, teamId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership || membership.status !== "active") {
      throw new ForbiddenException("팀에 소속되어 있지 않습니다.");
    }
    return membership;
  }

  async createMeeting(userId: string, body: {
    teamId: string;
    title?: string;
    rawContent: string;
    meetingDate?: string;
  }) {
    const meeting = await this.prisma.meeting.create({
      data: {
        teamId: body.teamId,
        title: body.title ?? null,
        rawContent: body.rawContent,
        meetingDate: body.meetingDate ? new Date(body.meetingDate) : new Date(),
        createdBy: userId,
        analysisStatus: "pending",
      },
    });

    this.events.track("meeting_created", { userId, teamId: body.teamId, metadata: { meetingId: meeting.id } });

    // Start async AI analysis
    this._analyzeMeeting(meeting.id, body.teamId, body.rawContent).catch(() => {});

    return {
      id: meeting.id,
      analysisStatus: "pending",
    };
  }

  async listMeetings(teamId: string, viewerRole: string) {
    const meetings = await this.prisma.meeting.findMany({
      where: { teamId },
      orderBy: { meetingDate: "desc" },
      include: {
        actionItems: { select: { status: true } },
      },
    });

    return meetings.map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      analysisStatus: m.analysisStatus,
      actionItemsCount: m.actionItems.length,
      actionItemsDone: m.actionItems.filter((a) => a.status === "done").length,
      meetingDate: m.meetingDate.toISOString(),
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async getMeetingDetail(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        actionItems: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!meeting) throw new NotFoundException("회의를 찾을 수 없어요.");

    return {
      id: meeting.id,
      teamId: meeting.teamId,
      title: meeting.title,
      rawContent: meeting.rawContent,
      summary: meeting.summary,
      analysisStatus: meeting.analysisStatus,
      nextAgenda: meeting.nextAgenda as string[] | null,
      meetingDate: meeting.meetingDate.toISOString(),
      createdBy: meeting.createdBy,
      actionItems: meeting.actionItems.map((a) => ({
        id: a.id,
        description: a.description,
        assigneeName: a.assigneeName,
        assigneeId: a.assigneeId,
        dueDate: a.dueDate?.toISOString() ?? null,
        status: a.status,
        completedAt: a.completedAt?.toISOString() ?? null,
      })),
    };
  }

  async getActionItem(actionItemId: string) {
    const item = await this.prisma.actionItem.findUnique({
      where: { id: actionItemId },
    });
    if (!item) throw new NotFoundException("액션 아이템을 찾을 수 없어요.");
    return item;
  }

  async toggleActionItem(actionItemId: string) {
    const item = await this.prisma.actionItem.findUnique({
      where: { id: actionItemId },
    });
    if (!item) throw new NotFoundException();

    const newStatus = item.status === "open" ? "done" : "open";
    const updated = await this.prisma.actionItem.update({
      where: { id: actionItemId },
      data: {
        status: newStatus,
        completedAt: newStatus === "done" ? new Date() : null,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      completedAt: updated.completedAt?.toISOString() ?? null,
    };
  }

  async getOpenActionItems(teamId: string) {
    const items = await this.prisma.actionItem.findMany({
      where: { teamId, status: "open" },
      orderBy: { createdAt: "asc" },
      include: {
        meeting: { select: { title: true, meetingDate: true } },
      },
    });

    return items.map((a) => ({
      id: a.id,
      description: a.description,
      assigneeName: a.assigneeName,
      dueDate: a.dueDate?.toISOString() ?? null,
      meetingTitle: a.meeting.title,
      meetingDate: a.meeting.meetingDate.toISOString(),
    }));
  }

  // --- Private: AI analysis ---

  private async _analyzeMeeting(meetingId: string, teamId: string, rawContent: string) {
    await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { analysisStatus: "analyzing" },
    });

    try {
      const analysis = await this._callAI(rawContent, teamId);

      // Save summary
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: {
          summary: analysis.summary,
          nextAgenda: analysis.nextAgenda,
          analysisStatus: "done",
        },
      });

      // Save action items
      if (analysis.actionItems.length > 0) {
        await this.prisma.actionItem.createMany({
          data: analysis.actionItems.map((item) => ({
            meetingId,
            teamId,
            description: item.description,
            assigneeName: item.assigneeName,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
          })),
        });
      }

      // Emit Socket.io event
      this.realtime.server.to(`team:${teamId}`).emit("meeting:analyzed", {
        meetingId,
        summary: analysis.summary,
        actionItemsCount: analysis.actionItems.length,
      });
    } catch {
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: { analysisStatus: "failed" },
      });
    }
  }

  private async _callAI(rawContent: string, teamId: string): Promise<MeetingAnalysis> {
    if (!this.openai) {
      return this._fallbackAnalysis(rawContent);
    }

    // Fetch open action items from previous meetings for context
    const prevOpenActions = await this.prisma.actionItem.findMany({
      where: { teamId, status: "open" },
      select: { description: true, assigneeName: true },
      take: 10,
    });

    const prevContext = prevOpenActions.length > 0
      ? `\n\n이전 미완료 액션 아이템:\n${prevOpenActions.map((a) => `- ${a.description} (담당: ${a.assigneeName ?? "미정"})`).join("\n")}`
      : "";

    let retries = 3;
    while (retries > 0) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `당신은 팀 프로젝트 회의록을 분석하는 AI 어시스턴트입니다.
회의 내용을 분석하여 다음 JSON 형식으로 응답하세요:
{
  "summary": "핵심 논의 사항 3~5줄 요약",
  "actionItems": [
    { "description": "구체적 할 일", "assigneeName": "담당자 이름 또는 null", "dueDate": "YYYY-MM-DD 또는 null" }
  ],
  "nextAgenda": ["다음 회의에서 다뤄야 할 안건 1~3개"]
}

규칙:
- 요약은 한국어로, 핵심만 간결하게
- 액션 아이템은 "누가 무엇을 언제까지" 형식
- 회의 내용에서 이름이 언급되면 assigneeName에 포함
- 다음 안건은 미완료 액션 + 새로운 블로커 기반
- 액션 아이템이 없으면 빈 배열`,
            },
            {
              role: "user",
              content: `<meeting_content>\n${rawContent}\n</meeting_content>${prevContext}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("Empty AI response");

        const parsed = JSON.parse(content) as MeetingAnalysis;
        return {
          summary: parsed.summary ?? "",
          actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
          nextAgenda: Array.isArray(parsed.nextAgenda) ? parsed.nextAgenda : [],
        };
      } catch {
        retries--;
        if (retries === 0) return this._fallbackAnalysis(rawContent);
      }
    }

    return this._fallbackAnalysis(rawContent);
  }

  private _fallbackAnalysis(rawContent: string): MeetingAnalysis {
    // Simple fallback: first 200 chars as summary, no action items
    const summary = rawContent.length > 200
      ? rawContent.substring(0, 200) + "..."
      : rawContent;
    return {
      summary: `(AI 분석 실패 — 원문 요약) ${summary}`,
      actionItems: [],
      nextAgenda: [],
    };
  }
}
