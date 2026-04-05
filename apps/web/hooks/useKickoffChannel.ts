"use client";

import { useEffect } from "react";
import { useSocket } from "./useSocket";

export type KickoffEvent =
  | { type: "kickoff:started"; phase: "topic_decision" }
  | { type: "kickoff:phase_changed"; phase: "topic_decision" | "architecture" | "summary" }
  | { type: "kickoff:chat_updated"; phase: "topic_brainstorm" | "architecture" }
  | { type: "kickoff:chat_reset"; phase: "topic_brainstorm" | "architecture" }
  | { type: "kickoff:completed"; topicTitle?: string }
  // Batch A/B/C/D
  | { type: "kickoff:decisions_updated" }
  | { type: "kickoff:concerns_updated"; userId: string }
  | { type: "kickoff:role_status_updated"; userId: string; status: string; alternativeRole?: string }
  | { type: "kickoff:all_roles_accepted" }
  | { type: "kickoff:artifacts_ready"; count: number }
  | { type: "kickoff:member_signed"; userId: string };

interface UseKickoffChannelOptions {
  teamId: string;
  onEvent: (event: KickoffEvent) => void;
}

/**
 * Subscribe to kickoff socket events for a team.
 * Uses the shared team socket room (subscribe:team).
 */
export function useKickoffChannel({ teamId, onEvent }: UseKickoffChannelOptions) {
  const { socket } = useSocket(teamId);

  useEffect(() => {
    if (!socket) return;

    const EVENTS = [
      "kickoff:started",
      "kickoff:phase_changed",
      "kickoff:chat_updated",
      "kickoff:chat_reset",
      "kickoff:completed",
      "kickoff:decisions_updated",
      "kickoff:concerns_updated",
      "kickoff:role_status_updated",
      "kickoff:all_roles_accepted",
      "kickoff:artifacts_ready",
      "kickoff:member_signed",
    ] as const;

    const handlers = EVENTS.map((eventType) => {
      const handler = (data: Record<string, unknown>) => {
        onEvent({ type: eventType, ...data } as KickoffEvent);
      };
      socket.on(eventType, handler);
      return { eventType, handler };
    });

    return () => {
      handlers.forEach(({ eventType, handler }) => {
        socket.off(eventType, handler);
      });
    };
  }, [socket, onEvent]);
}
