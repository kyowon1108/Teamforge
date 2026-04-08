'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';

const MAX_IDEAS = 5;
const TITLE_MAX = 30;
const DESC_MAX = 100;

interface IdeaSubmitFormProps {
  teamId: string;
  ideaCount: number;
  onSubmitted: (idea: {
    id: string;
    title: string;
    description: string;
    type: 'original';
  }) => void;
  /** If provided, submits as build-on to parent idea */
  parentIdeaId?: string;
  /** Label override for submit button */
  submitLabel?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function IdeaSubmitForm({
  teamId,
  ideaCount,
  onSubmitted,
  parentIdeaId,
  submitLabel,
}: IdeaSubmitFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAtLimit = ideaCount >= MAX_IDEAS;
  const canSubmit = title.trim().length > 0 && !submitting && !isAtLimit;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const endpoint = parentIdeaId
        ? `${API_URL}/api/teams/${teamId}/brainstorm/ideas/${parentIdeaId}/build-on`
        : `${API_URL}/api/teams/${teamId}/brainstorm/ideas`;

      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });

      if (res.ok) {
        const data = (await res.json()) as { id: string };
        onSubmitted({
          id: data.id ?? `optimistic-${Date.now()}`,
          title: title.trim(),
          description: description.trim(),
          type: 'original',
        });
        setTitle('');
        setDescription('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rounded-lg p-4 mb-4"
      style={{
        background: 'var(--tf-bg-layer-default)',
        border: '1px solid var(--tf-stroke-neutral)',
      }}
    >
      {/* Counter */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: 'var(--tf-fg-muted)' }}>
          {ideaCount}/{MAX_IDEAS}개 작성
        </span>
        {isAtLimit && (
          <span className="text-xs" style={{ color: 'var(--tf-fg-warning)' }}>
            최대 개수에 도달했습니다
          </span>
        )}
      </div>

      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="아이디어 제목 (최대 30자)"
        maxLength={TITLE_MAX}
        disabled={isAtLimit}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 mb-2"
        style={{
          background: 'var(--tf-bg-layer-alt)',
          border: '1px solid var(--tf-stroke-neutral)',
          color: 'var(--tf-fg-default)',
          minHeight: '40px',
        }}
      />

      {/* Description input */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="간단한 설명 (최대 100자)"
        maxLength={DESC_MAX}
        rows={2}
        disabled={isAtLimit}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 resize-none mb-3"
        style={{
          background: 'var(--tf-bg-layer-alt)',
          border: '1px solid var(--tf-stroke-neutral)',
          color: 'var(--tf-fg-default)',
        }}
      />

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full rounded-lg font-semibold text-sm transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
        style={{
          minHeight: '44px',
          background: 'var(--tf-bg-brand-solid)',
          color: 'white',
        }}
      >
        {submitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Plus size={16} />
        )}
        {submitLabel ?? '아이디어 추가'}
      </button>
    </div>
  );
}
