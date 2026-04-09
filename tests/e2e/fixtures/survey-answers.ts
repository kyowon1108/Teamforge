/**
 * 성향별 설문 답변 템플릿 (5종).
 * SurveyAnswersSchema 호환 구조.
 */

const BASE = {
  projectCount: 3,
  gitCollabLevel: 3,
  actualRoles: ['developer'],
  workStyleVector: [60, 70, 50],
  freeText: '팀 프로젝트에서 다양한 경험을 쌓고 싶습니다.',
  githubUrl: 'https://github.com/testuser',
  selfIntro: '개발에 열정이 있습니다.',
  collabChecklist: { dailyStandup: true, codeReview: true, retrospective: true },
  aiProfile: { preferences: ['code_draft', 'debugging'], verificationLevel: 3, selfLeadBlocks: [] },
};

export const SURVEY_TEMPLATES = {
  initiator: {
    ...BASE,
    backgroundType: 'cs_major' as const,
    experienceTier: 4,
    techStackList: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
    skillRatings: { frontend: 4, backend: 4, database: 3, devops: 2 },
    workArchetype: 'initiator' as const,
    blockConfidence: { ui: 'lead', api: 'contribute', db: 'contribute', auth: 'learn', pm: 'lead' },
  },
  architect: {
    ...BASE,
    backgroundType: 'working_dev' as const,
    experienceTier: 5,
    techStackList: ['Go', 'Kubernetes', 'AWS', 'Terraform', 'Redis'],
    skillRatings: { frontend: 2, backend: 5, database: 4, devops: 5 },
    workArchetype: 'architect' as const,
    blockConfidence: { ui: 'cant', api: 'lead', db: 'lead', auth: 'lead', devops: 'lead' },
  },
  executor: {
    ...BASE,
    backgroundType: 'bootcamp' as const,
    experienceTier: 3,
    techStackList: ['React', 'TypeScript', 'Tailwind'],
    skillRatings: { frontend: 4, backend: 2, database: 2, devops: 1 },
    workArchetype: 'executor' as const,
    blockConfidence: { ui: 'lead', api: 'learn', db: 'learn', testing: 'contribute' },
  },
  coordinator: {
    ...BASE,
    backgroundType: 'pm_designer' as const,
    experienceTier: 2,
    techStackList: ['Figma', 'Notion'],
    skillRatings: { frontend: 1, backend: 1, database: 1, devops: 0 },
    workArchetype: 'coordinator' as const,
    blockConfidence: { pm: 'lead', docs: 'lead', ui: 'learn' },
  },
  documenter: {
    ...BASE,
    backgroundType: 'non_major' as const,
    experienceTier: 1,
    techStackList: ['Markdown', 'Notion'],
    skillRatings: { frontend: 1, backend: 0, database: 0, devops: 0 },
    workArchetype: 'documenter' as const,
    blockConfidence: { docs: 'lead', pm: 'contribute' },
  },
} as const;

/** 유저 ID → 설문 템플릿 매핑 */
export const USER_SURVEY_MAP: Record<string, keyof typeof SURVEY_TEMPLATES> = {
  '00000000-0000-4000-a000-000000000001': 'initiator',
  '00000000-0000-4000-a000-000000000002': 'architect',
  '00000000-0000-4000-a000-000000000003': 'executor',
  '00000000-0000-4000-a000-000000000004': 'coordinator',
  '00000000-0000-4000-a000-000000000006': 'initiator',
  '00000000-0000-4000-a000-000000000007': 'executor',
  '00000000-0000-4000-a000-000000000008': 'architect',
  '00000000-0000-4000-a000-000000000010': 'executor',
  '00000000-0000-4000-a000-000000000011': 'initiator',
  '00000000-0000-4000-a000-000000000012': 'architect',
  '00000000-0000-4000-a000-000000000013': 'executor',
  '00000000-0000-4000-a000-000000000015': 'initiator',
  '00000000-0000-4000-a000-000000000016': 'coordinator',
  '00000000-0000-4000-a000-000000000017': 'executor',
  '00000000-0000-4000-a000-000000000018': 'architect',
  '00000000-0000-4000-a000-000000000019': 'initiator',
  '00000000-0000-4000-a000-000000000020': 'executor',
};
