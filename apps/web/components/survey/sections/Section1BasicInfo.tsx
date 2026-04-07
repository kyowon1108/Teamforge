'use client';

import {
  Sprout, Clock3, Rocket, Briefcase, Award,
  GraduationCap, BookOpen, School, Palette,
} from 'lucide-react';

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

const experienceOptions = [
  { value: 1, label: '0~6개월', Icon: Sprout },
  { value: 2, label: '6개월~1년', Icon: Clock3 },
  { value: 3, label: '1~2년', Icon: Rocket },
  { value: 4, label: '2~4년', Icon: Briefcase },
  { value: 5, label: '4년 이상', Icon: Award },
];

const backgroundOptions = [
  { value: 'cs_major', label: 'CS 전공', Icon: GraduationCap },
  { value: 'non_major', label: '비전공 독학', Icon: BookOpen },
  { value: 'bootcamp', label: '부트캠프', Icon: School },
  { value: 'working_dev', label: '현업 개발자', Icon: Briefcase },
  { value: 'pm_designer', label: 'PM/디자이너', Icon: Palette },
];

export default function Section1BasicInfo({ answers, updateAnswers }: Props) {
  const experienceTier = answers.experienceTier as number | undefined;
  const backgroundType = answers.backgroundType as string | undefined;

  return (
    <div className="space-y-8">
      <div>
        <h2
          className="text-[18px] font-semibold mb-1"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          어디서부터 시작했는지 알려주세요
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--tf-fg-muted)' }}>
          대략적인 경험치만 알아도 충분해요
        </p>
      </div>

      {/* Q1 */}
      <div className="space-y-3">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q1. 개발을 시작한 지 얼마나 되었나요?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {experienceOptions.map(({ value, label, Icon }) => {
            const isSelected = experienceTier === value;
            return (
              <button
                key={value}
                onClick={() => updateAnswers({ experienceTier: value })}
                className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl transition-all duration-150 ease-out"
                style={{
                  border: isSelected
                    ? '2px solid var(--tf-stroke-brand)'
                    : '2px solid transparent',
                  background: isSelected
                    ? 'var(--tf-bg-brand)'
                    : 'var(--tf-bg-layer-default)',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  outline: isSelected ? 'none' : undefined,
                  boxShadow: isSelected
                    ? '0 0 0 1px var(--tf-stroke-neutral-muted)'
                    : '0 0 0 1px var(--tf-stroke-neutral)',
                }}
              >
                <Icon
                  className="w-6 h-6"
                  style={{
                    color: isSelected
                      ? 'var(--tf-fg-brand)'
                      : 'var(--tf-fg-muted)',
                  }}
                />
                <span
                  className="text-[13px] font-medium text-center"
                  style={{
                    color: isSelected
                      ? 'var(--tf-fg-brand)'
                      : 'var(--tf-fg-default)',
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q2 */}
      <div className="space-y-3">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q2. 현재 본인을 가장 잘 설명하는 것은?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {backgroundOptions.map(({ value, label, Icon }) => {
            const isSelected = backgroundType === value;
            return (
              <button
                key={value}
                onClick={() => updateAnswers({ backgroundType: value })}
                className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl transition-all duration-150 ease-out"
                style={{
                  border: isSelected
                    ? '2px solid var(--tf-stroke-brand)'
                    : '2px solid transparent',
                  background: isSelected
                    ? 'var(--tf-bg-brand)'
                    : 'var(--tf-bg-layer-default)',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isSelected
                    ? '0 0 0 1px var(--tf-stroke-neutral-muted)'
                    : '0 0 0 1px var(--tf-stroke-neutral)',
                }}
              >
                <Icon
                  className="w-6 h-6"
                  style={{
                    color: isSelected
                      ? 'var(--tf-fg-brand)'
                      : 'var(--tf-fg-muted)',
                  }}
                />
                <span
                  className="text-[13px] font-medium text-center"
                  style={{
                    color: isSelected
                      ? 'var(--tf-fg-brand)'
                      : 'var(--tf-fg-default)',
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
