'use client';

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

const hoursOptions = [
  { value: 5, label: '5시간 이하' },
  { value: 10, label: '5~10시간' },
  { value: 20, label: '10~20시간' },
  { value: 30, label: '20시간 이상' },
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
          가용 시간
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--tf-fg-muted)' }}>
          프로젝트에 투입할 수 있는 시간을 알려주세요
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
        <div className="grid grid-cols-2 gap-2">
          {hoursOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateAnswers({ weeklyHours: opt.value })}
              className="h-11 rounded-lg border text-[14px] transition-all"
              style={{
                borderColor:
                  weeklyHours === opt.value
                    ? 'var(--tf-stroke-brand)'
                    : 'var(--tf-stroke-neutral)',
                background:
                  weeklyHours === opt.value ? 'var(--tf-bg-info)' : 'transparent',
                color:
                  weeklyHours === opt.value
                    ? 'var(--tf-fg-default)'
                    : 'var(--tf-fg-muted)',
                fontWeight: weeklyHours === opt.value ? 500 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
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
