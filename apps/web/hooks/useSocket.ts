"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";

export function useSocket(teamId?: string | null) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!teamId || !session?.teamforgeToken) return;

    const socket = io(WS_URL, {
      auth: { token: session.teamforgeToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("subscribe:team", { teamId });
    });

    socket.on("disconnect", () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.emit("unsubscribe:team", { teamId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [teamId, session?.teamforgeToken]);

  return { socket: socketRef.current, connected };
}
