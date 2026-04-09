'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';

interface UseTeamSocketOptions {
  teamId: string;
  onEvent?: (event: string, data: unknown) => void;
}

export function useTeamSocket({ teamId, onEvent }: UseTeamSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [transport, setTransport] = useState<'websocket' | 'polling'>('polling');
  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        // 1. ws-token 발급
        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
        const res = await fetch(`${API_URL}/api/auth/ws-token`, {
          credentials: 'include',
        });
        if (!res.ok) {
          setTransport('polling');
          return;
        }
        const { token } = (await res.json()) as { token: string };

        if (cancelled) return;

        // 2. 소켓 연결 (teamId별 인스턴스)
        const sock = getSocket(token, teamId);
        socketRef.current = sock;

        sock.on('connect', () => {
          setConnected(true);
          setTransport('websocket');
          sock.emit('join:team', teamId);
        });

        sock.on('disconnect', () => setConnected(false));
        sock.on('connect_error', () => setTransport('polling'));

        // 3. 이벤트 핸들러 등록
        const events = [
          'brainstorm:idea_submitted',
          'brainstorm:idea_merged',
          'brainstorm:idea_reacted',
          'brainstorm:phase_advanced',
          'topic:vote_cast',
          'topic:confirmed',
          'role:finalized',
        ];
        events.forEach((ev) =>
          sock.on(ev, (data: unknown) => onEventRef.current?.(ev, data))
        );

        sock.connect();
      } catch {
        setTransport('polling');
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.emit('leave:team', teamId);
      }
      disconnectSocket(teamId);
      socketRef.current = null;
    };
  }, [teamId]);

  return { connected, transport };
}
