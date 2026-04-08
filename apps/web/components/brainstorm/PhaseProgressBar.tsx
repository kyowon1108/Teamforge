'use client';

import { Lightbulb, Share2, Cpu, Vote, CheckCircle2 } from 'lucide-react';

const PHASES = [
  { key: 'ideation', label: '아이디어 발상', Icon: Lightbulb },
  { key: 'sharing', label: '아이디어 공유', Icon: Share2 },
  { key: 'clustering', label: 'AI 정리', Icon: Cpu },
  { key: 'voting', label: '투표', Icon: Vote },
] as const;

type PhaseKey = (typeof PHASES)[number]['key'];

const PHASE_ORDER: Record<PhaseKey, number> = {
  ideation: 0,
  sharing: 1,
  clustering: 2,
  voting: 3,
};

interface PhaseProgressBarProps {
  current: PhaseKey;
}

export default function PhaseProgressBar({ current }: PhaseProgressBarProps) {
  const currentIndex = PHASE_ORDER[current];

  return (
    <div className="flex items-center justify-between gap-1 mb-6">
      {PHASES.map((phase, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const Icon = phase.Icon;

        return (
          <div key={phase.key} className="flex-1 flex flex-col items-center gap-1.5">
            {/* Step indicator */}
            <div className="flex items-center w-full">
              {i > 0 && (
                <div
                  className="flex-1 h-0.5 -mr-1"
                  style={{
                    background: isCompleted || isCurrent
                      ? 'var(--tf-bg-brand-solid)'
                      : 'var(--tf-stroke-neutral)',
                  }}
                />
              )}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
                style={{
                  background: isCompleted
                    ? 'var(--tf-bg-brand-solid)'
                    : isCurrent
                    ? 'color-mix(in srgb, var(--tf-bg-brand-solid) 15%, transparent)'
                    : 'var(--tf-bg-layer-alt)',
                  border: isCurrent
                    ? '2px solid var(--tf-bg-brand-solid)'
                    : isCompleted
                    ? 'none'
                    : '1px solid var(--tf-stroke-neutral)',
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 size={16} style={{ color: 'white' }} />
                ) : (
                  <Icon
                    size={14}
                    style={{
                      color: isCurrent
                        ? 'var(--tf-bg-brand-solid)'
                        : 'var(--tf-fg-muted)',
                    }}
                  />
                )}
              </div>
              {i < PHASES.length - 1 && (
                <div
                  className="flex-1 h-0.5 -ml-1"
                  style={{
                    background: isCompleted
                      ? 'var(--tf-bg-brand-solid)'
                      : 'var(--tf-stroke-neutral)',
                  }}
                />
              )}
            </div>
            {/* Label */}
            <span
              className="text-xs font-medium text-center"
              style={{
                color: isCurrent
                  ? 'var(--tf-bg-brand-solid)'
                  : isCompleted
                  ? 'var(--tf-fg-default)'
                  : 'var(--tf-fg-muted)',
              }}
            >
              {phase.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
