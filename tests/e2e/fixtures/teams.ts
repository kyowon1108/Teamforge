import type { TeamType, ProjectDuration, CompletionTarget, DomainHint } from '@teamforge/contracts';
import { U } from './users';

interface TeamContextFixture {
  teamType: TeamType | null;
  projectDuration: ProjectDuration | null;
  completionTarget: CompletionTarget | null;
  hasNonDeveloper: boolean | null;
  usesVibeCoding: boolean | null;
  hasSkillGap: boolean | null;
  domainHints: DomainHint[];
}

/**
 * 5팀 구성. 유저 겹침: U01(A+C), U02(A+B), U08(B+D), U13(C+E)
 *
 * Team Context (KF-036~KF-040):
 *   A — HACKATHON / DEMO    (vibe coding 활용 팀)
 *   B — SW_MAESTRO / MVP    (skill gap 큰 팀)
 *   C — SIDE_PROJECT / MVP  (비개발자 포함 팀)
 *   D — STARTUP / PRODUCTION (장기 프로덕션 팀)
 *   E — 컨텍스트 없음        (legacy nullable 회귀 시뮬레이션)
 */
export const TEAMS = {
  A: {
    id: '00000000-0000-4000-b000-000000000001',
    name: '프론트엔드 드림팀',
    inviteCode: 'ALPHA1',
    leader: U.U01,
    members: [U.U02, U.U03, U.U04],
    observers: [U.U05],
    context: {
      teamType: 'HACKATHON',
      projectDuration: 'UNDER_1_DAY',
      completionTarget: 'DEMO',
      hasNonDeveloper: false,
      usesVibeCoding: true,
      hasSkillGap: false,
      domainHints: ['SOCIAL', 'AI_ML'],
    } as TeamContextFixture,
  },
  B: {
    id: '00000000-0000-4000-b000-000000000002',
    name: '백엔드 코어팀',
    inviteCode: 'BETA22',
    leader: U.U02,
    members: [U.U06, U.U07, U.U08],
    observers: [U.U09],
    context: {
      teamType: 'SW_MAESTRO',
      projectDuration: 'ONE_TO_THREE_MONTHS',
      completionTarget: 'MVP',
      hasNonDeveloper: false,
      usesVibeCoding: true,
      hasSkillGap: true,
      domainHints: ['EDUCATION'],
    } as TeamContextFixture,
  },
  C: {
    id: '00000000-0000-4000-b000-000000000003',
    name: '모바일 퓨전팀',
    inviteCode: 'GAMMA3',
    leader: U.U10,
    members: [U.U01, U.U11, U.U12, U.U13],
    observers: [U.U14],
    context: {
      teamType: 'SIDE_PROJECT',
      projectDuration: 'ONE_TO_FOUR_WEEKS',
      completionTarget: 'MVP',
      hasNonDeveloper: true,
      usesVibeCoding: false,
      hasSkillGap: false,
      domainHints: [],
    } as TeamContextFixture,
  },
  D: {
    id: '00000000-0000-4000-b000-000000000004',
    name: '인프라 스쿼드',
    inviteCode: 'DELTA4',
    leader: U.U15,
    members: [U.U08, U.U16, U.U17, U.U18],
    observers: [],
    context: {
      teamType: 'STARTUP',
      projectDuration: 'OVER_THREE_MONTHS',
      completionTarget: 'PRODUCTION',
      hasNonDeveloper: false,
      usesVibeCoding: false,
      hasSkillGap: false,
      domainHints: ['INFRA_TOOLING'],
    } as TeamContextFixture,
  },
  E: {
    id: '00000000-0000-4000-b000-000000000005',
    name: '크로스플랫폼팀',
    inviteCode: 'EPSIL5',
    leader: U.U19,
    members: [U.U13, U.U20],
    observers: [],
    // legacy 시뮬레이션 — 모든 컨텍스트 null/[]
    context: {
      teamType: null,
      projectDuration: null,
      completionTarget: null,
      hasNonDeveloper: null,
      usesVibeCoding: null,
      hasSkillGap: null,
      domainHints: [],
    } as TeamContextFixture,
  },
} as const;

export type TeamKey = keyof typeof TEAMS;
