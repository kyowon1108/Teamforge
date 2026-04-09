import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

@WebSocketGateway({
  namespace: '/team',
  cors: {
    origin: process.env.CORS_ORIGIN ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
@Injectable()
export class TeamGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  async afterInit(server: Server) {
    // Redis가 있으면 Socket.io Redis adapter 적용 (다중 인스턴스 지원)
    if (this.redis) {
      try {
        const { createAdapter } = await import('@socket.io/redis-adapter');
        const pubClient = this.redis.duplicate();
        const subClient = this.redis.duplicate();
        server.adapter(createAdapter(pubClient, subClient));
      } catch {
        // Redis adapter 실패 시 기본 인메모리 adapter 사용
      }
    }
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.WS_TOKEN_SECRET ?? process.env.JWT_SECRET,
      });
      client.data.userId = payload.sub;

      // teamId is sent by the client via join event
      client.on('join:team', async (teamId: string) => {
        // CUID/UUID format validation
        if (!/^[a-z0-9_-]{20,36}$/i.test(teamId)) return;
        // Membership verification
        const membership = await this.prisma.teamMembership.findUnique({
          where: { teamId_userId: { teamId, userId: client.data.userId } },
        });
        if (!membership) return; // silently reject non-members

        // 기존 team 룸에서 자동 leave (다중 팀 룸 구독 방지)
        for (const room of client.rooms) {
          if (room.startsWith('team:') && room !== `team:${teamId}`) {
            client.leave(room);
          }
        }

        client.join(`team:${teamId}`);
      });

      client.on('leave:team', (teamId: string) => {
        client.leave(`team:${teamId}`);
      });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket) {
    // cleanup if needed
  }

  /** Emit an event to all clients in a team room */
  emitToTeam(teamId: string, event: string, payload: unknown) {
    this.server.to(`team:${teamId}`).emit(event, payload);
  }
}
