'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateRoleAction } from './actions';
import type { TeamRole } from '@teamforge/contracts';

interface RoleOption {
  role: TeamRole;
  label: string;
  description: string;
  icon: React.ReactNode;
  colorVar: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'leader',
    label: '팀장',
    description: '팀 방향 결정 + 최종 승인',
    icon: <Crown size={28} />,
    colorVar: 'var(--tf-role-leader)',
  },
  {
    role: 'member',
    label: '팀원',
    description: '기여하고 의견 제시',
    icon: <Users size={28} />,
    colorVar: 'var(--tf-role-member)',
  },
  {
    role: 'observer',
    label: '옵저버',
    description: '진행 상황 관람 + 읽기 전용',
    icon: <Eye size={28} />,
    colorVar: 'var(--tf-role-observer)',
  },
];

export default function RoleSelectClient() {
  const router = useRouter();
  const [selected, setSelected] = useState<TeamRole | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleNext() {
    if (!selected) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = await updateRoleAction(selected);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.push('/team/join-or-create');
      } catch {
        setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    });
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--tf-text-primary)' }}
        >
          역할을 선택하세요
        </h1>
        <p className="text-sm" style={{ color: 'var(--tf-text-muted)' }}>
          팀 내에서 맡을 역할을 선택합니다. 이후에도 변경 가능합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {ROLE_OPTIONS.map(({ role, label, description, icon, colorVar }) => {
          const isSelected = selected === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => setSelected(role)}
              className="flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{
                minHeight: '44px',
                borderColor: isSelected ? colorVar : 'var(--tf-border-subtle)',
                background: isSelected
                  ? `color-mix(in oklab, ${colorVar} 8%, var(--tf-surface-card))`
                  : 'var(--tf-surface-card)',
                boxShadow: isSelected ? `0 0 0 1px ${colorVar}` : undefined,
              }}
              aria-pressed={isSelected}
            >
              <span
                style={{
                  color: isSelected ? colorVar : 'var(--tf-text-muted)',
                  transition: 'color 0.15s',
                }}
              >
                {icon}
              </span>
              <div>
                <p
                  className="font-semibold text-base"
                  style={{ color: isSelected ? colorVar : 'var(--tf-text-primary)' }}
                >
                  {label}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--tf-text-muted)' }}>
                  {description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p
          className="text-sm text-center mb-4"
          style={{ color: 'var(--tf-status-error)' }}
          role="alert"
        >
          {error}
        </p>
      )}

      <Button
        onClick={handleNext}
        disabled={!selected || isPending}
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {isPending ? '저장 중...' : '다음'}
      </Button>
    </div>
  );
}
