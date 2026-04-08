import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  namespace: '/team',
  cors: {
    origin: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
@Injectable()
export class TeamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

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
        // CUID format validation
        if (!/^[a-z0-9]{20,30}$/.test(teamId)) return;
        // Membership verification
        const membership = await this.prisma.teamMembership.findUnique({
          where: { teamId_userId: { teamId, userId: client.data.userId } },
        });
        if (!membership) return; // silently reject non-members
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
