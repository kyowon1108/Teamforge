'use client';

import { useState } from 'react';
import { X, Merge, Loader2, Plus } from 'lucide-react';
import type { BrainstormIdea } from './IdeaCard';

interface MergeModalProps {
  parentIdeas: [BrainstormIdea, BrainstormIdea];
  teamId: string;
  sessionId: string;
  onSubmitted: (idea: {
    id: string;
    title: string;
    description: string;
    type: 'merge';
    parentIds: [string, string];
  }) => void;
  onClose: () => void;
}

const TITLE_MAX = 30;
const DESC_MAX = 100;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function MergeModal({
  parentIdeas,
  teamId,
  onSubmitted,
  onClose,
}: MergeModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/teams/${teamId}/brainstorm/ideas/merge`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentIds: [parentIdeas[0].id, parentIdeas[1].id],
            title: title.trim(),
            description: description.trim(),
          }),
        }
      );
      if (res.ok) {
        const data = (await res.json()) as { id: string };
        onSubmitted({
          id: data.id ?? `optimistic-merge-${Date.now()}`,
          title: title.trim(),
          description: description.trim(),
          type: 'merge',
          parentIds: [parentIdeas[0].id, parentIdeas[1].id],
        });
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-xl p-5 z-10"
        style={{
          background: 'var(--tf-bg-layer-default)',
          border: '1px solid var(--tf-stroke-neutral)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Merge size={18} style={{ color: 'var(--tf-bg-brand-solid)' }} />
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--tf-fg-default)' }}
            >
              아이디어 합치기
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:opacity-70 transition-opacity"
            style={{ color: 'var(--tf-fg-muted)' }}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Parent ideas preview - side by side */}
        <div className="flex gap-3 mb-4">
          {parentIdeas.map((idea, i) => (
            <div key={idea.id} className="flex-1 flex items-start gap-2">
              <div
                className="flex-1 rounded-lg p-3"
                style={{
                  background: 'var(--tf-bg-layer-alt)',
                  border: '1px solid var(--tf-stroke-neutral)',
                }}
              >
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--tf-fg-default)' }}
                >
                  {idea.title}
                </p>
                {idea.description && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--tf-fg-muted)' }}
                  >
                    {idea.description}
                  </p>
                )}
              </div>
              {i === 0 && (
                <div
                  className="flex items-center justify-center shrink-0 self-center"
                  style={{ color: 'var(--tf-fg-muted)' }}
                >
                  <Plus size={16} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input form */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="합친 아이디어 제목 (최대 30자)"
          maxLength={TITLE_MAX}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 mb-2"
          style={{
            background: 'var(--tf-bg-layer-alt)',
            border: '1px solid var(--tf-stroke-neutral)',
            color: 'var(--tf-fg-default)',
            minHeight: '40px',
          }}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="간단한 설명 (최대 100자)"
          maxLength={DESC_MAX}
          rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 resize-none mb-4"
          style={{
            background: 'var(--tf-bg-layer-alt)',
            border: '1px solid var(--tf-stroke-neutral)',
            color: 'var(--tf-fg-default)',
          }}
        />

        {/* Submit */}
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
            <Merge size={16} />
          )}
          합치기
        </button>
      </div>
    </div>
  );
}
