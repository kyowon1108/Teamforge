import {
  Zap,
  GraduationCap,
  Rocket,
  Wrench,
  Lightbulb,
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  PlayCircle,
  CheckCircle,
  ShieldCheck,
  Coins,
  HeartPulse,
  BookOpen,
  Users,
  Brain,
  Server,
  ShoppingCart,
  Landmark,
  Gamepad2,
  Package,
  type LucideIcon,
} from 'lucide-react';
import type {
  TeamType,
  ProjectDuration,
  CompletionTarget,
  DomainHint,
} from '@teamforge/contracts';

export interface OptionMeta<T extends string> {
  value: T;
  label: string;
  description?: string;
  Icon: LucideIcon;
}

export const TEAM_TYPE_OPTIONS: OptionMeta<TeamType>[] = [
  { value: 'HACKATHON',    label: '해커톤',          description: '단기 집중 개발 (24~72시간)',   Icon: Zap },
  { value: 'CAPSTONE',     label: '캡스톤 / 졸업',   description: '학교 팀 프로젝트',              Icon: GraduationCap },
  { value: 'BOOTCAMP',     label: '부트캠프',        description: '교육 과정 팀 프로젝트',         Icon: Rocket },
  { value: 'SIDE_PROJECT', label: '사이드 프로젝트', description: '자유 개인/팀 프로젝트',         Icon: Wrench },
  { value: 'STARTUP',      label: '스타트업',        description: '실제 서비스 창업',              Icon: Lightbulb },
];

export const PROJECT_DURATION_OPTIONS: OptionMeta<ProjectDuration>[] = [
  { value: 'UNDER_1_DAY',         label: '1일 이내',   description: '해커톤',  Icon: Calendar },
  { value: 'ONE_TO_FOUR_WEEKS',   label: '1~4주',      Icon: CalendarDays },
  { value: 'ONE_TO_THREE_MONTHS', label: '1~3개월',    Icon: CalendarRange },
  { value: 'OVER_THREE_MONTHS',   label: '3개월 이상', Icon: CalendarClock },
];

export const COMPLETION_TARGET_OPTIONS: OptionMeta<CompletionTarget>[] = [
  { value: 'DEMO',       label: '데모 / 프로토타입', description: '"동작하는 것을 보여주면 충분해요"',          Icon: PlayCircle },
  { value: 'MVP',        label: 'MVP',                description: '"핵심 기능을 실제로 사용할 수 있어야 해요"', Icon: CheckCircle },
  { value: 'PRODUCTION', label: '서비스 출시 수준',   description: '"보안, 배포, 유지보수까지 고려해요"',       Icon: ShieldCheck },
];

export const DOMAIN_HINT_OPTIONS: OptionMeta<DomainHint>[] = [
  { value: 'FINTECH',       label: '핀테크',        Icon: Coins },
  { value: 'HEALTHCARE',    label: '헬스케어',      Icon: HeartPulse },
  { value: 'EDUCATION',     label: '교육',          Icon: BookOpen },
  { value: 'SOCIAL',        label: '소셜',          Icon: Users },
  { value: 'AI_ML',         label: 'AI · ML',       Icon: Brain },
  { value: 'INFRA_TOOLING', label: '인프라 · 툴링', Icon: Server },
  { value: 'ECOMMERCE',     label: 'E커머스',       Icon: ShoppingCart },
  { value: 'PUBLIC',        label: '공공 · 사회',   Icon: Landmark },
  { value: 'GAME',          label: '게임 · 엔터',   Icon: Gamepad2 },
  { value: 'OTHER',         label: '기타',          Icon: Package },
];

/** Compact labels for dashboard banner (Icon + short label) */
export const TEAM_TYPE_SHORT: Record<TeamType, { label: string; Icon: LucideIcon }> = {
  HACKATHON:    { label: '해커톤',          Icon: Zap },
  CAPSTONE:     { label: '캡스톤',          Icon: GraduationCap },
  BOOTCAMP:     { label: '부트캠프',        Icon: Rocket },
  SIDE_PROJECT: { label: '사이드 프로젝트', Icon: Wrench },
  STARTUP:      { label: '스타트업',        Icon: Lightbulb },
};

export const DURATION_SHORT: Record<ProjectDuration, string> = {
  UNDER_1_DAY: '1일 이내',
  ONE_TO_FOUR_WEEKS: '1~4주',
  ONE_TO_THREE_MONTHS: '1~3개월',
  OVER_THREE_MONTHS: '3개월 이상',
};

export const TARGET_SHORT: Record<CompletionTarget, string> = {
  DEMO: '데모',
  MVP: 'MVP',
  PRODUCTION: '서비스 출시',
};
