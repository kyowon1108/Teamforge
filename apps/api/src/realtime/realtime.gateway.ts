import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  },
})
export class RealtimeGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage("subscribe:team")
  handleSubscribe(
    @MessageBody() data: { teamId: string },
    @ConnectedSocket() client: Socket
  ) {
    client.join(`team:${data.teamId}`);
  }

  @SubscribeMessage("unsubscribe:team")
  handleUnsubscribe(
    @MessageBody() data: { teamId: string },
    @ConnectedSocket() client: Socket
  ) {
    client.leave(`team:${data.teamId}`);
  }

  emitToTeam(teamId: string, event: string, data: unknown) {
    this.server.to(`team:${teamId}`).emit(event, data);
  }
}
