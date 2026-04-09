'use client';

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** 팀별 소켓 인스턴스 관리 — 팀 전환 시 이전 구독이 남지 않도록 분리 */
const socketMap = new Map<string, Socket>();

export function getSocket(wsToken: string, teamId: string): Socket {
  // 기존 소켓이 있고 연결 중이면 재사용
  const existing = socketMap.get(teamId);
  if (existing && !existing.disconnected) {
    return existing;
  }

  // 다른 팀의 소켓이 남아있으면 정리
  for (const [key, sock] of socketMap) {
    if (key !== teamId) {
      sock.disconnect();
      socketMap.delete(key);
    }
  }

  const sock = io(`${API_URL}/team`, {
    auth: { token: wsToken },
    transports: ['websocket', 'polling'],
    autoConnect: false,
  });

  socketMap.set(teamId, sock);
  return sock;
}

export function disconnectSocket(teamId?: string) {
  if (teamId) {
    const sock = socketMap.get(teamId);
    if (sock) {
      sock.disconnect();
      socketMap.delete(teamId);
    }
  } else {
    // 전체 정리
    for (const [key, sock] of socketMap) {
      sock.disconnect();
      socketMap.delete(key);
    }
  }
}
