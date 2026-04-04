"use client";

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

const archetypes = [
  { value: "initiator", label: "시작하는 사람 (Initiator)", desc: "아이디어를 내고 먼저 시작하는 편" },
  { value: "architect", label: "설계하는 사람 (Architect)", desc: "구조와 방향을 잡는 걸 좋아하는 편" },
  { value: "executor", label: "실행하는 사람 (Executor)", desc: "정해진 일을 빠르게 해내는 편" },
  { value: "coordinator", label: "조율하는 사람 (Coordinator)", desc: "의견을 모으고 일정을 관리하는 편" },
  { value: "documenter", label: "기록하는 사람 (Documenter)", desc: "문서화와 정리를 잘 하는 편" },
];

const sliders = [
  { key: "solo_vs_collab", left: "혼자 집중", right: "함께 작업" },
  { key: "prototype_vs_design", left: "빠른 프로토타입", right: "꼼꼼한 설계" },
  { key: "new_vs_familiar", left: "새로운 기술", right: "익숙한 기술" },
];

const desiredRoleOptions = [
  "백엔드 개발", "프론트엔드 개발", "풀스택 개발",
  "DevOps/인프라", "AI/데이터", "PM/기획", "디자인", "QA/테스트",
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
        <h2 className="text-[18px] font-semibold text-[var(--tf-fg-default)] mb-1">
          협업 스타일
        </h2>
        <p className="text-[13px] text-[var(--tf-fg-muted)]">
          팀에서의 작업 성향을 알려주세요
        </p>
      </div>

      {/* Q9 */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">
          Q9. 팀에서 나는 주로...
        </p>
        <div className="space-y-2">
          {archetypes.map((a) => (
            <button
              key={a.value}
              onClick={() => updateAnswers({ workArchetype: a.value })}
              className={`
                w-full px-4 py-3 rounded-r2 border text-left transition-all
                ${workArchetype === a.value
                  ? "border-[var(--tf-stroke-brand)] bg-[var(--tf-bg-info)]"
                  : "border-[var(--tf-stroke-neutral)] hover:border-[var(--tf-stroke-brand)]"
                }
              `}
            >
              <span className="text-[14px] font-medium text-[var(--tf-fg-default)]">
                {a.label}
              </span>
              <p className="text-[12px] text-[var(--tf-fg-muted)] mt-0.5">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Q10 */}
      <div className="space-y-4">
        <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">
          Q10. 선호 작업 방식
        </p>
        {sliders.map((s, i) => (
          <div key={s.key} className="space-y-2">
            <div className="flex justify-between text-[12px] text-[var(--tf-fg-muted)]">
              <span>{s.left}</span>
              <span>{s.right}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={workStyleVector[i]}
              onChange={(e) => updateSlider(i, Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-[var(--tf-bg-layer-alt)] accent-[var(--tf-fg-brand)] cursor-pointer"
              style={{ touchAction: "none" }}
            />
          </div>
        ))}
      </div>

      {/* Q11 */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">
          Q11. 맡고 싶은 역할 (최대 2개)
        </p>
        <div className="flex flex-wrap gap-2">
          {desiredRoleOptions.map((role) => (
            <button
              key={role}
              onClick={() => toggleDesiredRole(role)}
              className={`
                h-9 px-3 rounded-r2 text-[13px] transition-all
                ${desiredRoles.includes(role)
                  ? "bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)]"
                  : "border border-[var(--tf-stroke-neutral)] text-[var(--tf-fg-muted)] hover:border-[var(--tf-stroke-brand)]"
                }
                ${desiredRoles.length >= 2 && !desiredRoles.includes(role) ? "opacity-50" : ""}
              `}
            >
              {role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
