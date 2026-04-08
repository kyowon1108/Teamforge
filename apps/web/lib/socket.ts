'use client';

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
let socket: Socket | null = null;

export function getSocket(wsToken: string): Socket {
  if (!socket || socket.disconnected) {
    socket = io(`${API_URL}/team`, {
      auth: { token: wsToken },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
