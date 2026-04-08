'use client';

import { Users } from 'lucide-react';

interface IdeaSubmissionCounterProps {
  submitted: number;
  total: number;
}

export default function IdeaSubmissionCounter({ submitted, total }: IdeaSubmissionCounterProps) {
  const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--tf-bg-layer-default)',
        border: '1px solid var(--tf-stroke-neutral)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Users size={16} style={{ color: 'var(--tf-fg-muted)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--tf-fg-default)' }}>
          {submitted}/{total}명이 아이디어를 제출했습니다
        </span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--tf-bg-layer-alt)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: 'var(--tf-bg-brand-solid)',
          }}
        />
      </div>
    </div>
  );
}
