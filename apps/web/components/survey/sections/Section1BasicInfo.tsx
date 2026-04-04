"use client";

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

const experienceOptions = [
  { value: 1, label: "6개월 미만" },
  { value: 2, label: "6개월~1년" },
  { value: 3, label: "1~2년" },
  { value: 4, label: "2~4년" },
  { value: 5, label: "4년 이상" },
];

const backgroundOptions = [
  { value: "cs_major", label: "CS/SW 전공 학부생" },
  { value: "non_major", label: "비전공이지만 개발 학습 중" },
  { value: "bootcamp", label: "부트캠프 수료" },
  { value: "working_dev", label: "현업 개발자(인턴 포함)" },
  { value: "pm_designer", label: "PM/디자이너(개발 경험 있음)" },
];

export default function Section1BasicInfo({ answers, updateAnswers }: Props) {
  const experienceTier = answers.experienceTier as number | undefined;
  const backgroundType = answers.backgroundType as string | undefined;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--tf-fg-default)] mb-1">
          기본 정보
        </h2>
        <p className="text-[13px] text-[var(--tf-fg-muted)]">
          개발 경험 수준을 알려주세요
        </p>
      </div>

      {/* Q1 */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">
          Q1. 개발을 시작한 지 얼마나 되었나요?
        </p>
        <div className="space-y-2">
          {experienceOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateAnswers({ experienceTier: opt.value })}
              className={`
                w-full h-11 px-4 rounded-r2 border text-left text-[14px] transition-all
                ${experienceTier === opt.value
                  ? "border-[var(--tf-stroke-brand)] bg-[var(--tf-bg-info)] text-[var(--tf-fg-default)] font-medium"
                  : "border-[var(--tf-stroke-neutral)] text-[var(--tf-fg-muted)] hover:border-[var(--tf-stroke-brand)]"
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Q2 */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">
          Q2. 현재 본인을 가장 잘 설명하는 것은?
        </p>
        <div className="space-y-2">
          {backgroundOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateAnswers({ backgroundType: opt.value })}
              className={`
                w-full h-11 px-4 rounded-r2 border text-left text-[14px] transition-all
                ${backgroundType === opt.value
                  ? "border-[var(--tf-stroke-brand)] bg-[var(--tf-bg-info)] text-[var(--tf-fg-default)] font-medium"
                  : "border-[var(--tf-stroke-neutral)] text-[var(--tf-fg-muted)] hover:border-[var(--tf-stroke-brand)]"
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
