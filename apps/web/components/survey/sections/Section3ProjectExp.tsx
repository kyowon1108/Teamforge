"use client";

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

const projectCountOptions = [
  { value: 0, label: "없음" },
  { value: 1, label: "1개" },
  { value: 2, label: "2~3개" },
  { value: 4, label: "4개 이상" },
];

const roleOptions = [
  "API/서버 개발", "화면(UI) 구현", "DB 스키마 설계",
  "배포/인프라", "PM/일정 관리", "디자인", "AI 모델", "테스트/QA",
];

const gitLevels = [
  { value: 0, label: "Git 안 써봄", hint: "Git 기초 튜토리얼을 제공해드릴게요" },
  { value: 1, label: "혼자 add/commit/push", hint: "Git 브랜칭 가이드를 추천해요" },
  { value: 2, label: "branch + merge 경험", hint: "기본 워크플로우를 추천해요" },
  { value: 3, label: "PR 기반 코드 리뷰", hint: "GitHub Flow를 추천해요" },
  { value: 4, label: "전략적 브랜칭", hint: "고급 옵션을 제공해요" },
];

export default function Section3ProjectExp({ answers, updateAnswers }: Props) {
  const projectCount = answers.projectCount as number | undefined;
  const actualRoles = (answers.actualRoles ?? []) as string[];
  const gitCollabLevel = answers.gitCollabLevel as number | undefined;

  const toggleRole = (role: string) => {
    const newRoles = actualRoles.includes(role)
      ? actualRoles.filter((r) => r !== role)
      : [...actualRoles, role];
    updateAnswers({ actualRoles: newRoles });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--tf-fg-default)] mb-1">
          프로젝트 경험
        </h2>
        <p className="text-[13px] text-[var(--tf-fg-muted)]">
          이전 프로젝트 경험을 알려주세요
        </p>
      </div>

      {/* Q6 */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">
          Q6. 완성한 프로젝트 수는?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {projectCountOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateAnswers({ projectCount: opt.value })}
              className={`
                h-11 rounded-r2 border text-[14px] transition-all
                ${projectCount === opt.value
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

      {/* Q7 — conditional on Q6 >= 1 */}
      {(projectCount ?? 0) >= 1 && (
        <div className="space-y-3">
          <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">
            Q7. 최근 프로젝트에서 맡았던 역할은?
          </p>
          <div className="flex flex-wrap gap-2">
            {roleOptions.map((role) => (
              <button
                key={role}
                onClick={() => toggleRole(role)}
                className={`
                  h-9 px-3 rounded-r2 text-[13px] transition-all
                  ${actualRoles.includes(role)
                    ? "bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)]"
                    : "border border-[var(--tf-stroke-neutral)] text-[var(--tf-fg-muted)] hover:border-[var(--tf-stroke-brand)]"
                  }
                `}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Q8 */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">
          Q8. Git 협업 경험 레벨은?
        </p>
        <div className="space-y-2">
          {gitLevels.map((lvl) => (
            <button
              key={lvl.value}
              onClick={() => updateAnswers({ gitCollabLevel: lvl.value })}
              className={`
                w-full px-4 py-3 rounded-r2 border text-left transition-all
                ${gitCollabLevel === lvl.value
                  ? "border-[var(--tf-stroke-brand)] bg-[var(--tf-bg-info)]"
                  : "border-[var(--tf-stroke-neutral)] hover:border-[var(--tf-stroke-brand)]"
                }
              `}
            >
              <span className="text-[14px] text-[var(--tf-fg-default)]">
                Level {lvl.value}: {lvl.label}
              </span>
              {gitCollabLevel === lvl.value && (
                <p className="text-[12px] text-[var(--tf-fg-brand)] mt-1">
                  {lvl.hint}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
