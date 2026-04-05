import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async track(
    event: string,
    opts?: { userId?: string; teamId?: string; metadata?: Record<string, unknown> }
  ) {
    try {
      await this.prisma.eventLog.create({
        data: {
          event,
          userId: opts?.userId ?? null,
          teamId: opts?.teamId ?? null,
          metadata: opts?.metadata
            ? (opts.metadata as Prisma.InputJsonValue)
            : undefined,
        },
      });
    } catch {
      // Fire-and-forget — never block the main flow
    }
  }
}
