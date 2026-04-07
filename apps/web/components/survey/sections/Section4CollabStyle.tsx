'use client';

import {
  Sparkles, Layout, Hammer, Users, FileText,
  Server, Monitor, Boxes, Cloud, Bot, Calendar, Palette, TestTube2,
} from 'lucide-react';

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

const archetypes = [
  {
    value: 'initiator',
    label: '시작하는 사람',
    desc: '아이디어를 내고 먼저 시작하는 편',
    Icon: Sparkles,
  },
  {
    value: 'architect',
    label: '설계하는 사람',
    desc: '구조와 방향을 잡는 걸 좋아하는 편',
    Icon: Layout,
  },
  {
    value: 'executor',
    label: '실행하는 사람',
    desc: '정해진 일을 빠르게 해내는 편',
    Icon: Hammer,
  },
  {
    value: 'coordinator',
    label: '조율하는 사람',
    desc: '의견을 모으고 일정을 관리하는 편',
    Icon: Users,
  },
  {
    value: 'documenter',
    label: '기록하는 사람',
    desc: '문서화와 정리를 잘 하는 편',
    Icon: FileText,
  },
];

const sliders = [
  { key: 'solo_vs_collab', left: '혼자 집중', right: '함께 작업' },
  { key: 'prototype_vs_design', left: '빠른 프로토타입', right: '꼼꼼한 설계' },
  { key: 'new_vs_familiar', left: '새로운 기술', right: '익숙한 기술' },
];

const desiredRoleOptions = [
  { label: '백엔드 개발', Icon: Server },
  { label: '프론트엔드 개발', Icon: Monitor },
  { label: '풀스택 개발', Icon: Boxes },
  { label: 'DevOps/인프라', Icon: Cloud },
  { label: 'AI/데이터', Icon: Bot },
  { label: 'PM/기획', Icon: Calendar },
  { label: '디자인', Icon: Palette },
  { label: 'QA/테스트', Icon: TestTube2 },
];

export default function Section4CollabStyle({ answers, updateAnswers }: Props) {
  const workArchetype = answers.workArchetype as string | undefined;
  const workStyleVector = (answers.workStyleVector ?? [50, 50, 50]) as number[];
  const desiredRoles = (answers.desiredRoles ?? []) as string[];

  const updateSlider = (index: number, value: number) => {
    const newVec = [...workStyleVector];
    newVec[index] = value;
    updateAnswers({ workStyleVector: newVec });
  };

  const toggleDesiredRole = (role: string) => {
    let newRoles: string[];
    if (desiredRoles.includes(role)) {
      newRoles = desiredRoles.filter((r) => r !== role);
    } else if (desiredRoles.length < 2) {
      newRoles = [...desiredRoles, role];
    } else {
      return;
    }
    updateAnswers({ desiredRoles: newRoles });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2
          className="text-[18px] font-semibold mb-1"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          팀에서 일할 때의 스타일을 알려주세요
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--tf-fg-muted)' }}>
          정답은 없어요. 편한 방식 그대로 골라주세요
        </p>
      </div>

      {/* Q9 */}
      <div className="space-y-3">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q9. 팀에서 나는 주로...
        </p>
        <div className="space-y-2">
          {archetypes.map(({ value, label, desc, Icon }) => {
            const isSelected = workArchetype === value;
            return (
              <button
                key={value}
                onClick={() => updateAnswers({ workArchetype: value })}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 ease-out"
                style={{
                  border: isSelected
                    ? '2px solid var(--tf-stroke-brand)'
                    : '2px solid transparent',
                  background: isSelected ? 'var(--tf-bg-brand)' : 'var(--tf-bg-layer-default)',
                  boxShadow: isSelected
                    ? '0 0 0 1px var(--tf-stroke-neutral-muted)'
                    : '0 0 0 1px var(--tf-stroke-neutral)',
                  transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                <Icon
                  className="w-5 h-5 shrink-0"
                  style={{
                    color: isSelected ? 'var(--tf-fg-brand)' : 'var(--tf-fg-muted)',
                  }}
                />
                <div>
                  <span
                    className="text-[14px] font-medium"
                    style={{
                      color: isSelected ? 'var(--tf-fg-brand)' : 'var(--tf-fg-default)',
                    }}
                  >
                    {label}
                  </span>
                  <p
                    className="text-[12px] mt-0.5"
                    style={{ color: 'var(--tf-fg-muted)' }}
                  >
                    {desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q10 */}
      <div className="space-y-3">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q10. 선호 작업 방식
        </p>
        {sliders.map((s, i) => (
          <div
            key={s.key}
            className="rounded-xl p-4 space-y-3"
            style={{
              border: '1px solid var(--tf-stroke-neutral)',
              background: 'var(--tf-bg-layer-default)',
            }}
          >
            <div
              className="flex justify-between text-[12px]"
              style={{ color: 'var(--tf-fg-muted)' }}
            >
              <span>{s.left}</span>
              <span>{s.right}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={workStyleVector[i]}
              onChange={(e) => updateSlider(i, Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: 'var(--tf-bg-layer-alt)',
                accentColor: 'var(--tf-bg-brand-solid)',
                touchAction: 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Q11 */}
      <div className="space-y-3">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q11. 맡고 싶은 역할 (최대 2개)
        </p>
        <div className="flex flex-wrap gap-2">
          {desiredRoleOptions.map(({ label, Icon }) => {
            const isSelected = desiredRoles.includes(label);
            const isDisabled = desiredRoles.length >= 2 && !isSelected;
            return (
              <button
                key={label}
                onClick={() => !isDisabled && toggleDesiredRole(label)}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] transition-all duration-150 ease-out border"
                style={{
                  background: isSelected ? 'var(--tf-bg-brand-solid)' : 'transparent',
                  color: isSelected ? 'var(--tf-fg-inverse)' : 'var(--tf-fg-muted)',
                  borderColor: isSelected
                    ? 'var(--tf-bg-brand-solid)'
                    : 'var(--tf-stroke-neutral)',
                  pointerEvents: isDisabled ? 'none' : 'auto',
                  opacity: isDisabled ? 0.4 : 1,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
