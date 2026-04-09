'use client';

import { Lightbulb, Share2, Cpu, Vote } from 'lucide-react';

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

  // 7칸 그리드: col — line — col — line — col — line — col
  // 칼럼 4개 동일 너비(1fr), 선 3개 동일 너비(1fr)
  return (
    <nav aria-label="브레인스토밍 단계" className="mb-6 max-w-lg mx-auto">
      <div
        className="grid items-start"
        style={{
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr',
        }}
      >
        {PHASES.map((phase, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const Icon = phase.Icon;

          return (
            <div key={phase.key} className="contents">
              {/* 아이콘 + 라벨 칼럼 */}
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: isCompleted
                      ? 'var(--tf-bg-brand-solid)'
                      : 'transparent',
                    border: isCurrent
                      ? '2px solid var(--tf-bg-brand-solid)'
                      : isCompleted
                        ? '2px solid var(--tf-bg-brand-solid)'
                        : '1.5px solid var(--tf-stroke-neutral)',
                  }}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    style={{
                      color: isCompleted
                        ? 'white'
                        : isCurrent
                          ? 'var(--tf-bg-brand-solid)'
                          : 'var(--tf-fg-muted)',
                    }}
                  />
                </div>
                <span
                  className="text-[11px] sm:text-sm font-medium text-center mt-1.5 whitespace-nowrap"
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

              {/* 연결선 — 원 중심 높이(20px sm:24px)에 맞춤 */}
              {i < PHASES.length - 1 && (
                <div className="flex items-start pt-[19px] sm:pt-[23px]">
                  <div
                    className="w-full h-[2px]"
                    style={{
                      background: i < currentIndex
                        ? 'var(--tf-bg-brand-solid)'
                        : 'var(--tf-stroke-neutral)',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
