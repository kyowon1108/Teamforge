'use client';

import { Clock3, Clock6, Clock9, CalendarClock } from 'lucide-react';

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

const hoursOptions = [
  { value: 10, label: '주 10시간 미만', Icon: Clock3 },
  { value: 20, label: '주 10~20시간', Icon: Clock6 },
  { value: 30, label: '주 20~30시간', Icon: Clock9 },
  { value: 40, label: '주 30시간 이상', Icon: CalendarClock },
];

export default function Section5Availability({ answers, updateAnswers }: Props) {
  const weeklyHours = answers.weeklyHours as number | undefined;
  const freeText = (answers.freeText ?? '') as string;

  return (
    <div className="space-y-8">
      <div>
        <h2
          className="text-[18px] font-semibold mb-1"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          현실적인 투입 가능 시간을 알려주세요
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--tf-fg-muted)' }}>
          무리 없는 기준으로 적어주시면 일정 조정에 도움이 돼요
        </p>
      </div>

      {/* Q12 */}
      <div className="space-y-3">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q12. 주당 투입 가능한 시간은?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {hoursOptions.map(({ value, label, Icon }) => {
            const isSelected = weeklyHours === value;
            return (
              <button
                key={value}
                onClick={() => updateAnswers({ weeklyHours: value })}
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

      {/* Q13 */}
      <div className="space-y-3">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q13. 팀원들이 알았으면 하는 것{' '}
          <span className="text-[12px]" style={{ color: 'var(--tf-fg-subtle)' }}>
            (선택)
          </span>
        </p>
        <textarea
          value={freeText}
          onChange={(e) => updateAnswers({ freeText: e.target.value })}
          placeholder="예: 수요일 저녁은 알바로 빠져요 / 디자인 관련은 자신 있어요"
          rows={3}
          maxLength={300}
          className="w-full px-3 py-3 rounded-lg border text-[14px] placeholder:text-[var(--tf-fg-subtle)] focus:outline-none resize-none transition-shadow"
          style={{
            borderColor: 'var(--tf-stroke-neutral)',
            background: 'var(--tf-bg-layer-default)',
            color: 'var(--tf-fg-default)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 2px var(--tf-stroke-focus)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <p
          className="text-[11px] text-right"
          style={{ color: 'var(--tf-fg-subtle)' }}
        >
          {freeText.length}/300
        </p>
      </div>
    </div>
  );
}
