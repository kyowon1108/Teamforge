'use client';

import { useState, useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';

interface BrainstormTimerProps {
  duration: number; // seconds
  onComplete?: () => void;
}

export default function BrainstormTimer({ duration, onComplete }: BrainstormTimerProps) {
  const [remaining, setRemaining] = useState(duration);
  const completedRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (remaining === 0 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [remaining, onComplete]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isExpired = remaining === 0;
  const isLow = remaining > 0 && remaining <= 60;

  if (isExpired) {
    return (
      <div
        className="rounded-lg p-3 mb-4 flex items-center gap-2"
        style={{
          background: 'color-mix(in srgb, var(--tf-fg-warning) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--tf-fg-warning) 25%, transparent)',
        }}
      >
        <Timer size={16} style={{ color: 'var(--tf-fg-warning)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--tf-fg-warning)' }}>
          가이드 시간이 지났습니다. 준비되면 다음 단계로 진행하세요.
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-3 mb-4 flex items-center gap-2"
      style={{
        background: isLow
          ? 'color-mix(in srgb, var(--tf-fg-warning) 8%, transparent)'
          : 'color-mix(in srgb, var(--tf-fg-info) 8%, transparent)',
        border: isLow
          ? '1px solid color-mix(in srgb, var(--tf-fg-warning) 20%, transparent)'
          : '1px solid color-mix(in srgb, var(--tf-fg-info) 20%, transparent)',
      }}
    >
      <Timer
        size={16}
        style={{ color: isLow ? 'var(--tf-fg-warning)' : 'var(--tf-fg-info)' }}
      />
      <span
        className="text-sm font-medium tabular-nums"
        style={{ color: isLow ? 'var(--tf-fg-warning)' : 'var(--tf-fg-info)' }}
      >
        남은 시간: {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
