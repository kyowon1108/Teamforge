import type { Team } from '../../generated/prisma';

const DURATION_LABEL: Record<string, string> = {
  UNDER_1_DAY: '1일 이내 (해커톤)',
  ONE_TO_FOUR_WEEKS: '1~4주',
  ONE_TO_THREE_MONTHS: '1~3개월',
  OVER_THREE_MONTHS: '3개월 이상',
};

const TARGET_LABEL: Record<string, string> = {
  DEMO: '데모/프로토타입',
  MVP: 'MVP',
  PRODUCTION: '서비스 출시 수준',
};

/**
 * Team 객체를 GPT-4o 프롬프트용 <team_context> XML 블록으로 변환.
 * 서버가 생성하는 신뢰 가능한 값이라 escape 불필요. enum 값만 들어간다.
 */
export function buildTeamContextXml(
  team: Pick<
    Team,
    | 'teamType'
    | 'projectDuration'
    | 'completionTarget'
    | 'hasNonDeveloper'
    | 'usesVibeCoding'
    | 'hasSkillGap'
    | 'domainHints'
  >,
): string {
  const duration = team.projectDuration
    ? (DURATION_LABEL[team.projectDuration] ?? 'UNKNOWN')
    : 'UNKNOWN';
  const target = team.completionTarget
    ? (TARGET_LABEL[team.completionTarget] ?? 'MVP')
    : 'MVP';
  const hints = team.domainHints.length > 0 ? team.domainHints.join(', ') : '없음';

  return [
    '<team_context>',
    `  <type>${team.teamType ?? 'UNKNOWN'}</type>`,
    `  <duration>${duration}</duration>`,
    `  <completion_target>${target}</completion_target>`,
    `  <has_non_developer>${team.hasNonDeveloper ?? 'unknown'}</has_non_developer>`,
    `  <uses_vibe_coding>${team.usesVibeCoding ?? 'unknown'}</uses_vibe_coding>`,
    `  <has_skill_gap>${team.hasSkillGap ?? 'unknown'}</has_skill_gap>`,
    `  <domain_hints>${hints}</domain_hints>`,
    '</team_context>',
  ].join('\n');
}

export const TEAM_CONTEXT_SYSTEM_RULES = `
반드시 다음을 고려하세요:
- completion_target이 "데모/프로토타입"이면 24~72시간 내 구현 가능한 범위의 주제를 우선하세요
- completion_target이 "서비스 출시 수준"이면 보안·배포·유지보수를 고려한 주제를 제안하세요
- has_non_developer가 true이면 바이브코딩으로도 기여 가능한 역할이 있는 주제를 선호하세요
- uses_vibe_coding이 true이면 AI 도구로 빠르게 프로토타이핑 가능한 구조의 주제를 선호하세요
- domain_hints가 있으면 해당 도메인 내에서 주제를 제안하되, 팀 역량과 맞지 않으면 rationale에 명시하세요
- type이 HACKATHON이면 심사 기준과 짧은 완성 주기를 고려하세요
- has_skill_gap이 true이면 역할 분리가 명확한 주제를 선호하세요
`.trim();
