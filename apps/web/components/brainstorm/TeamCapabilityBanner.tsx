'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';

interface TeamCapability {
  topStrengths: string[];
  weakAreas?: string[];
  aiInterestCount?: number;
  memberCount: number;
}

interface TeamCapabilityBannerProps {
  capability: TeamCapability;
}

export default function TeamCapabilityBanner({ capability }: TeamCapabilityBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const strengthsText = capability.topStrengths.join(', ');

  return (
    <div
      className="rounded-lg p-4 mb-4 flex items-start gap-3 relative"
      style={{
        background: 'color-mix(in srgb, var(--tf-fg-info) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--tf-fg-info) 20%, transparent)',
      }}
    >
      <Info size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--tf-fg-info)' }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--tf-fg-default)' }}>
          이 팀은 <strong>{strengthsText}</strong>에 강합니다
        </p>
        {capability.aiInterestCount != null && capability.aiInterestCount > 0 && (
          <p className="text-xs mt-1" style={{ color: 'var(--tf-fg-muted)' }}>
            팀원 {capability.memberCount}명 중 {capability.aiInterestCount}명이 AI 활용에 관심을
            표시했습니다
          </p>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-md hover:opacity-70 transition-opacity"
        style={{ color: 'var(--tf-fg-muted)' }}
        aria-label="닫기"
      >
        <X size={16} />
      </button>
    </div>
  );
}
