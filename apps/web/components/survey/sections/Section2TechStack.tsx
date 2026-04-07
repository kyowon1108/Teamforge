'use client';

import {
  MonitorSmartphone, Server, Database, Cloud, Bot, Palette,
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

const TECH_CATEGORIES: Record<string, string[]> = {
  '언어': ['JavaScript/TS', 'Python', 'Java', 'C/C++', 'Go', 'Kotlin', 'Rust', 'Dart'],
  '프론트엔드': ['React', 'Next.js', 'Vue', 'Svelte', 'Flutter', 'React Native'],
  '백엔드': ['NestJS', 'Express', 'Spring Boot', 'Django', 'FastAPI', 'Go Fiber'],
  '데이터베이스': ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Firebase', 'Supabase'],
  '인프라': ['Docker', 'GitHub Actions', 'AWS', 'GCP', 'Vercel', 'Kubernetes'],
  'AI/데이터': ['PyTorch', 'TensorFlow', 'LangChain', 'Pandas', 'scikit-learn', 'Hugging Face'],
  '디자인': ['Figma', 'Photoshop', 'Blender', 'Unity'],
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  '프론트엔드': MonitorSmartphone,
  '백엔드': Server,
  '인프라/DB': Database,
  '클라우드': Cloud,
  'AI/데이터': Bot,
  '디자인': Palette,
};

const SKILL_LEVELS = [
  { value: 1, label: '튜토리얼 따라해 봄' },
  { value: 2, label: '간단한 프로젝트 완성' },
  { value: 3, label: '팀 프로젝트에서 기여' },
  { value: 4, label: '주도적 설계 가능' },
  { value: 5, label: '타인 멘토링 가능' },
];

const STRENGTH_AREAS = [
  { label: '백엔드', Icon: Server },
  { label: '프론트엔드', Icon: MonitorSmartphone },
  { label: '데이터베이스', Icon: Database },
  { label: '인프라/DevOps', Icon: Cloud },
  { label: 'AI/ML', Icon: Bot },
  { label: '디자인', Icon: Palette },
];

export default function Section2TechStack({ answers, updateAnswers }: Props) {
  const techStackList = (answers.techStackList ?? []) as string[];
  const skillRatings = (answers.skillRatings ?? {}) as Record<string, number>;
  const topStrengths = (answers.topStrengths ?? []) as string[];

  const toggleTech = (tech: string) => {
    const newList = techStackList.includes(tech)
      ? techStackList.filter((t) => t !== tech)
      : [...techStackList, tech];
    const newRatings = { ...skillRatings };
    if (!newList.includes(tech)) delete newRatings[tech];
    updateAnswers({ techStackList: newList, skillRatings: newRatings });
  };

  const setRating = (tech: string, rating: number) => {
    updateAnswers({ skillRatings: { ...skillRatings, [tech]: rating } });
  };

  const toggleStrength = (area: string) => {
    let newStrengths: string[];
    if (topStrengths.includes(area)) {
      newStrengths = topStrengths.filter((s) => s !== area);
    } else if (topStrengths.length < 2) {
      newStrengths = [...topStrengths, area];
    } else {
      return;
    }
    updateAnswers({ topStrengths: newStrengths });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2
          className="text-[18px] font-semibold mb-1"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          지금 바로 써먹을 수 있는 기술을 골라주세요
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--tf-fg-muted)' }}>
          익숙한 기술만 골라도 충분해요
        </p>
      </div>

      {/* Q3: Multi-select */}
      <div className="space-y-4">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q3. 경험해 본 기술을 모두 선택하세요
        </p>
        {Object.entries(TECH_CATEGORIES).map(([category, techs]) => {
          const CategoryIcon = CATEGORY_ICONS[category];
          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-1.5">
                {CategoryIcon && (
                  <CategoryIcon
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--tf-fg-muted)' }}
                  />
                )}
                <p
                  className="text-[12px] font-medium uppercase tracking-wide"
                  style={{ color: 'var(--tf-fg-muted)' }}
                >
                  {category}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {techs.map((tech) => {
                  const isSelected = techStackList.includes(tech);
                  return (
                    <button
                      key={tech}
                      onClick={() => toggleTech(tech)}
                      className="h-9 px-3 rounded-lg text-[13px] transition-all duration-150 ease-out border"
                      style={{
                        background: isSelected
                          ? 'var(--tf-bg-brand-solid)'
                          : 'transparent',
                        color: isSelected
                          ? 'var(--tf-fg-inverse)'
                          : 'var(--tf-fg-muted)',
                        borderColor: isSelected
                          ? 'var(--tf-bg-brand-solid)'
                          : 'var(--tf-stroke-neutral)',
                      }}
                    >
                      {tech}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Q4: Skill ratings */}
      {techStackList.length > 0 && (
        <div
          className="rounded-xl p-4 space-y-4"
          style={{
            border: '1px solid var(--tf-stroke-neutral)',
            background: 'var(--tf-bg-layer-default)',
          }}
        >
          <p
            className="text-[14px] font-medium"
            style={{ color: 'var(--tf-fg-default)' }}
          >
            Q4. 선택한 기술별 숙련도를 표시하세요
          </p>
          <div className="space-y-3">
            {techStackList.map((tech) => (
              <div key={tech} className="flex items-center gap-3">
                <span
                  className="text-[13px] w-28 shrink-0 truncate"
                  style={{ color: 'var(--tf-fg-default)' }}
                >
                  {tech}
                </span>
                <div className="flex gap-1 flex-1">
                  {SKILL_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setRating(tech, level.value)}
                      title={level.label}
                      className="flex-1 h-8 rounded text-[11px] transition-all"
                      style={{
                        background:
                          (skillRatings[tech] ?? 0) >= level.value
                            ? 'var(--tf-bg-brand-solid)'
                            : 'var(--tf-bg-layer-alt)',
                        color:
                          (skillRatings[tech] ?? 0) >= level.value
                            ? 'var(--tf-fg-inverse)'
                            : 'var(--tf-fg-subtle)',
                      }}
                    >
                      {level.value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div
            className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]"
            style={{ color: 'var(--tf-fg-subtle)' }}
          >
            {SKILL_LEVELS.map((l) => (
              <span key={l.value}>
                {l.value}: {l.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Q5: Top strengths */}
      <div className="space-y-3">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q5. 자신 있는 영역 Top 2를 선택하세요
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {STRENGTH_AREAS.map(({ label, Icon }) => {
            const isSelected = topStrengths.includes(label);
            const isDisabled = topStrengths.length >= 2 && !isSelected;
            return (
              <button
                key={label}
                onClick={() => !isDisabled && toggleStrength(label)}
                className="flex items-center justify-center gap-2 h-10 rounded-lg text-[13px] font-medium transition-all duration-150 ease-out border"
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
