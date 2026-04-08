'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BadgeCheck, X } from 'lucide-react';
import { useTeamSocket } from '@/hooks/useTeamSocket';

interface Props {
  teamId: string;
  initialFinalRole: string | null;
}

export default function FinalizedRoleBadge({ teamId, initialFinalRole }: Props) {
  const [finalRole, setFinalRole] = useState<string | null>(initialFinalRole);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const prevRoleRef = useRef<string | null>(initialFinalRole);

  // -------------------------------------------------------------------------
  // Socket.io integration
  // -------------------------------------------------------------------------

  const handleSocketEvent = useCallback((event: string, data: unknown) => {
    if (event === 'role:finalized') {
      const d = data as { finalRole: string | null };
      if (prevRoleRef.current === null && d.finalRole !== null) {
        setToastMessage(`팀장이 역할을 확정했어요: ${d.finalRole}`);
        setTimeout(() => setToastMessage(null), 4000);
      }
      prevRoleRef.current = d.finalRole;
      setFinalRole(d.finalRole);
    }
  }, []);

  const { transport } = useTeamSocket({
    teamId,
    onEvent: handleSocketEvent,
  });

  // -------------------------------------------------------------------------
  // Polling fallback (only when WebSocket not connected)
  // -------------------------------------------------------------------------

  useEffect(() => {
    // WebSocket 연결 중이면 폴링 비활성화
    if (transport === 'websocket') return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

    async function poll() {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`${apiBase}/api/teams/${teamId}/kickoff/roles/me`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { finalRole: string | null; finalizedAt: string | null };
        if (prevRoleRef.current === null && data.finalRole !== null) {
          setToastMessage(`팀장이 역할을 확정했어요: ${data.finalRole}`);
          // Auto-dismiss after 4 seconds
          setTimeout(() => setToastMessage(null), 4000);
        }
        prevRoleRef.current = data.finalRole;
        setFinalRole(data.finalRole);
      } catch {
        // Polling failures are silent
      }
    }

    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [teamId, transport]);

  return (
    <>
      {/* Finalized role badge */}
      {finalRole && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4"
          style={{
            background: 'var(--tf-bg-brand)',
            border: '1px solid var(--tf-stroke-brand)',
          }}
        >
          <BadgeCheck className="w-5 h-5 shrink-0" style={{ color: 'var(--tf-fg-brand)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--tf-fg-brand)' }}>
            확정된 역할: {finalRole}
          </span>
        </div>
      )}

      {/* Inline toast notification */}
      {toastMessage && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg z-50"
          role="status"
          aria-live="polite"
          style={{
            background: 'var(--tf-bg-layer-default)',
            border: '1px solid var(--tf-stroke-brand)',
            color: 'var(--tf-fg-default)',
            maxWidth: '320px',
            width: 'max-content',
          }}
        >
          <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--tf-fg-positive)' }} />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            aria-label="닫기"
            style={{ color: 'var(--tf-fg-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
