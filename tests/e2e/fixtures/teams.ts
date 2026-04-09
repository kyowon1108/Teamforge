import { U } from './users';

/**
 * 5팀 구성. 유저 겹침: U01(A+C), U02(A+B), U08(B+D), U13(C+E)
 */
export const TEAMS = {
  A: {
    id: '00000000-0000-4000-b000-000000000001',
    name: '프론트엔드 드림팀',
    inviteCode: 'ALPHA1',
    leader: U.U01,
    members: [U.U02, U.U03, U.U04],
    observers: [U.U05],
  },
  B: {
    id: '00000000-0000-4000-b000-000000000002',
    name: '백엔드 코어팀',
    inviteCode: 'BETA22',
    leader: U.U02,
    members: [U.U06, U.U07, U.U08],
    observers: [U.U09],
  },
  C: {
    id: '00000000-0000-4000-b000-000000000003',
    name: '모바일 퓨전팀',
    inviteCode: 'GAMMA3',
    leader: U.U10,
    members: [U.U01, U.U11, U.U12, U.U13],
    observers: [U.U14],
  },
  D: {
    id: '00000000-0000-4000-b000-000000000004',
    name: '인프라 스쿼드',
    inviteCode: 'DELTA4',
    leader: U.U15,
    members: [U.U08, U.U16, U.U17, U.U18],
    observers: [],
  },
  E: {
    id: '00000000-0000-4000-b000-000000000005',
    name: '크로스플랫폼팀',
    inviteCode: 'EPSIL5',
    leader: U.U19,
    members: [U.U13, U.U20],
    observers: [],
  },
} as const;

export type TeamKey = keyof typeof TEAMS;
