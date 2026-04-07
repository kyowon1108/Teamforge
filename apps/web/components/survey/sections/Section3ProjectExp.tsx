'use client';

import {
  CircleOff, Folder, Layers3, Trophy,
  Server, Monitor, Boxes, Cloud, Bot, Calendar, Palette, TestTube2,
  GitBranch, Upload, GitMerge, GitPullRequest, Workflow,
} from 'lucide-react';

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

const projectCountOptions = [
  { value: 0, label: '없음', Icon: CircleOff },
  { value: 1, label: '1~2개', Icon: Folder },
  { value: 3, label: '3~5개', Icon: Layers3 },
  { value: 6, label: '6개 이상', Icon: Trophy },
];

const roleOptions = [
  { label: '백엔드 개발', Icon: Server },
  { label: '프론트엔드', Icon: Monitor },
  { label: '풀스택', Icon: Boxes },
  { label: 'DevOps', Icon: Cloud },
  { label: 'AI/데이터', Icon: Bot },
  { label: 'PM/기획', Icon: Calendar },
  { label: '디자인', Icon: Palette },
  { label: 'QA/테스트', Icon: TestTube2 },
];

const gitLevels = [
  { value: 0, label: 'Git 미사용', desc: 'zip/직접 공유', Icon: GitBranch },
  { value: 1, label: '개인 커밋', desc: '혼자 push', Icon: Upload },
  { value: 2, label: '브랜치 사용', desc: 'merge 경험', Icon: GitMerge },
  { value: 3, label: 'PR 리뷰', desc: '코드 리뷰 참여', Icon: GitPullRequest },
  { value: 4, label: '팀 협업', desc: 'CI/CD 포함', Icon: Workflow },
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
        <h2
          className="text-[18px] font-semibold mb-1"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          완성 경험과 Git 협업 감각을 알려주세요
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--tf-fg-muted)' }}>
          이전 프로젝트 경험을 알려주세요
        </p>
      </div>

      {/* Q6 */}
      <div className="space-y-3">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q6. 완성한 프로젝트 수는?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {projectCountOptions.map(({ value, label, Icon }) => {
            const isSelected = projectCount === value;
            return (
              <button
                key={value}
                onClick={() => updateAnswers({ projectCount: value })}
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
                    color: isSelected ? 'var(--tf-fg-brand)' : 'var(--tf-fg-muted)',
                  }}
                />
                <span
                  className="text-[13px] font-medium text-center"
                  style={{
                    color: isSelected ? 'var(--tf-fg-brand)' : 'var(--tf-fg-default)',
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q7 — 프로젝트 경험 있을 때만 표시 */}
      {(projectCount ?? 0) >= 1 && (
        <div className="space-y-3">
          <p
            className="text-[14px] font-medium"
            style={{ color: 'var(--tf-fg-default)' }}
          >
            Q7. 최근 프로젝트에서 맡았던 역할은?
          </p>
          <div className="flex flex-wrap gap-2">
            {roleOptions.map(({ label, Icon }) => {
              const isSelected = actualRoles.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => toggleRole(label)}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] transition-all duration-150 ease-out border"
                  style={{
                    background: isSelected ? 'var(--tf-bg-brand-solid)' : 'transparent',
                    color: isSelected ? 'var(--tf-fg-inverse)' : 'var(--tf-fg-muted)',
                    borderColor: isSelected
                      ? 'var(--tf-bg-brand-solid)'
                      : 'var(--tf-stroke-neutral)',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Q8 */}
      <div className="space-y-3">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q8. Git 협업 경험 레벨은?
        </p>
        <div className="space-y-2">
          {gitLevels.map(({ value, label, desc, Icon }) => {
            const isSelected = gitCollabLevel === value;
            return (
              <button
                key={value}
                onClick={() => updateAnswers({ gitCollabLevel: value })}
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
    </div>
  );
}
