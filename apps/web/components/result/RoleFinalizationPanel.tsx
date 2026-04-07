'use client';

import { useState } from 'react';
import { CheckCircle2, Pencil } from 'lucide-react';

const FINAL_ROLE_OPTIONS = [
  '프론트엔드',
  '백엔드',
  '풀스택',
  'PM/기획',
  'AI/데이터',
  'DevOps',
  'QA/테스트',
  '디자인',
  '기타',
] as const;

type FinalRole = (typeof FINAL_ROLE_OPTIONS)[number];

interface Props {
  targetUserId: string;
  targetUserName: string;
  currentConfirmedRole: string | null;
  teamId: string;
  onFinalized: (role: string) => void;
}

export default function RoleFinalizationPanel({
  targetUserId,
  targetUserName,
  currentConfirmedRole,
  teamId,
  onFinalized,
}: Props) {
  const [selected, setSelected] = useState<FinalRole | string>(
    currentConfirmedRole ?? FINAL_ROLE_OPTIONS[0]
  );
  const [isEditing, setIsEditing] = useState(currentConfirmedRole === null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedRole, setConfirmedRole] = useState<string | null>(currentConfirmedRole);

  async function handleFinalize() {
    setIsLoading(true);
    setError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${apiBase}/api/teams/${teamId}/kickoff/roles/finalize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, finalRole: selected }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? '저장에 실패했습니다.');
      }
      setConfirmedRole(selected);
      setIsEditing(false);
      onFinalized(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl p-4 mt-4"
      style={{
        background: 'var(--tf-bg-layer-default)',
        border: '1px solid var(--tf-stroke-neutral)',
      }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tf-fg-default)' }}>
        {targetUserName}님의 역할 확정
      </h3>

      {/* Already confirmed + not editing */}
      {confirmedRole && !isEditing ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--tf-fg-positive)' }} />
            <span className="text-sm" style={{ color: 'var(--tf-fg-default)' }}>
              현재 역할:{' '}
              <strong>{confirmedRole}</strong>
            </span>
          </div>
          <button
            onClick={() => {
              setSelected(confirmedRole);
              setIsEditing(true);
            }}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
            style={{
              border: '1px solid var(--tf-stroke-neutral)',
              color: 'var(--tf-fg-muted)',
            }}
          >
            <Pencil className="w-3 h-3" />
            수정
          </button>
        </div>
      ) : (
        /* Select + confirm */
        <div className="space-y-3">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              border: '1px solid var(--tf-stroke-neutral)',
              background: 'var(--tf-bg-layer-alt)',
              color: 'var(--tf-fg-default)',
            }}
          >
            {FINAL_ROLE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            {confirmedRole && (
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 h-9 rounded-lg text-sm font-medium transition-colors"
                style={{
                  border: '1px solid var(--tf-stroke-neutral)',
                  color: 'var(--tf-fg-muted)',
                }}
              >
                취소
              </button>
            )}
            <button
              onClick={handleFinalize}
              disabled={isLoading}
              className="flex-1 h-9 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'var(--tf-bg-brand-solid)',
                color: 'var(--tf-fg-inverse)',
              }}
            >
              {isLoading ? '저장 중...' : '역할 확정'}
            </button>
          </div>

          {error && (
            <p className="text-xs" style={{ color: 'var(--tf-fg-negative)' }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
