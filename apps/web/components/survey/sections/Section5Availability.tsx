"use client";

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

const hoursOptions = [
  { value: 5, label: "5시간 이하" },
  { value: 10, label: "5~10시간" },
  { value: 20, label: "10~20시간" },
  { value: 30, label: "20시간 이상" },
];

export default function Section5Availability({ answers, updateAnswers }: Props) {
  const weeklyHours = answers.weeklyHours as number | undefined;
  const freeText = (answers.freeText ?? "") as string;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--tf-fg-default)] mb-1">
          가용 시간
        </h2>
        <p className="text-[13px] text-[var(--tf-fg-muted)]">
          프로젝트에 투입할 수 있는 시간을 알려주세요
        </p>
      </div>

      {/* Q12 */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">
          Q12. 주당 투입 가능한 시간은?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {hoursOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateAnswers({ weeklyHours: opt.value })}
              className={`
                h-11 rounded-r2 border text-[14px] transition-all
                ${weeklyHours === opt.value
                  ? "border-[var(--tf-stroke-brand)] bg-[var(--tf-bg-info)] font-medium"
                  : "border-[var(--tf-stroke-neutral)] text-[var(--tf-fg-muted)] hover:border-[var(--tf-stroke-brand)]"
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Q13 */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">
          Q13. 팀원들이 알았으면 하는 것 <span className="text-[12px] text-[var(--tf-fg-subtle)]">(선택)</span>
        </p>
        <textarea
          value={freeText}
          onChange={(e) => updateAnswers({ freeText: e.target.value })}
          placeholder="예: 수요일 저녁은 알바로 빠져요 / 디자인 관련은 자신 있어요"
          rows={3}
          maxLength={300}
          className="w-full px-3 py-3 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--tf-stroke-focus)] resize-none transition-shadow"
        />
        <p className="text-[11px] text-[var(--tf-fg-subtle)] text-right">
          {freeText.length}/300
        </p>
      </div>
    </div>
  );
}
