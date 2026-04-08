/**
 * DEV ONLY — 스크린샷/Figma 캡처용 미리보기 라우트.
 * 프로덕션 빌드에서는 제거할 것.
 */
import RoleSelectClient from '../role-select/role-select-client';
import CreateTeamClient from '../team/create/create-team-client';
import JoinTeamClient from '../team/join/join-team-client';
import DashboardClient from '../dashboard/dashboard-client';
import SurveyClient from '../team/[teamId]/survey/survey-client';
import ResultClient from '../team/[teamId]/result/result-client';
import KickoffDashboardClient from '../team/[teamId]/dashboard/kickoff-dashboard-client';
import TopicDecisionClient from '../team/[teamId]/topic/topic-client';
import BrainstormClient from '../team/[teamId]/topic/brainstorm/brainstorm-client';
import AppHeader from '@/components/layout/AppHeader';
import { Globe, GitBranch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TopicItem } from '../team/[teamId]/topic/topic-client';
import type { BrainstormIdea } from '@/components/brainstorm/IdeaCard';

const MOCK_USER_NAME = '이교원';

const MOCK_TEAMS_EMPTY: [] = [];

const MOCK_TEAMS = [
  {
    teamId: 'team-001',
    name: '프론트엔드 드림팀',
    role: 'leader' as const,
    memberCount: 5,
    inviteCode: 'ABC123',
    createdAt: new Date('2026-04-01'),
  },
  {
    teamId: 'team-002',
    name: '백엔드 개발팀',
    role: 'member' as const,
    memberCount: 3,
    createdAt: new Date('2026-04-02'),
  },
];

// ---------------------------------------------------------------------------
// Brainstorm mocks
// ---------------------------------------------------------------------------

const MOCK_BRAINSTORM_IDEAS: BrainstormIdea[] = [
  {
    id: 'i1',
    sessionId: 's1',
    userId: 'u1',
    title: '캠퍼스 중고거래 플랫폼',
    description: '학생 간 물품 교환 서비스',
    type: 'original',
    createdAt: '2026-04-08T10:00:00Z',
    user: { name: '이교원' },
    reactions: [{ type: 'like', userId: 'u2' }],
    buildOnAsChild: [],
  },
  {
    id: 'i2',
    sessionId: 's1',
    userId: 'u2',
    title: 'AI 학습 도우미',
    description: '과목별 AI 튜터 챗봇',
    type: 'original',
    createdAt: '2026-04-08T10:01:00Z',
    user: { name: '김민준' },
    reactions: [],
    buildOnAsChild: [],
  },
  {
    id: 'i3',
    sessionId: 's1',
    userId: 'u3',
    title: '학생 마켓플레이스',
    description: '재능/서비스 거래 플랫폼',
    type: 'original',
    createdAt: '2026-04-08T10:02:00Z',
    user: { name: '박서연' },
    reactions: [
      { type: 'like', userId: 'u1' },
      { type: 'like', userId: 'u4' },
    ],
    buildOnAsChild: [],
  },
  {
    id: 'i4',
    sessionId: 's1',
    userId: 'u2',
    title: '중고거래 + AI 가격 추천',
    description: 'AI가 시세 분석해 적정가 추천',
    type: 'build_on',
    createdAt: '2026-04-08T10:03:00Z',
    user: { name: '김민준' },
    reactions: [
      { type: 'like', userId: 'u1' },
      { type: 'like', userId: 'u3' },
      { type: 'like', userId: 'u4' },
    ],
    buildOnAsChild: [{ parentIdea: { id: 'i1', title: '캠퍼스 중고거래 플랫폼' } }],
  },
];

const MOCK_BRAINSTORM_SESSION = {
  id: 's1',
  teamId: 'mock-team-001',
  phase: 'ideation' as const,
  facilitationMode: 'async',
  startedAt: null,
  endAt: null,
};

const MOCK_TEAM_CAPABILITY = {
  topStrengths: ['백엔드', 'DB'],
  weakAreas: ['프론트엔드'],
  aiInterestCount: 3,
  memberCount: 4,
};

// More ideas for sharing stage
const MOCK_SHARING_IDEAS: BrainstormIdea[] = [
  ...MOCK_BRAINSTORM_IDEAS,
  {
    id: 'i5',
    sessionId: 's1',
    userId: 'u3',
    title: '실시간 협업 캔버스',
    description: '팀 프로젝트 화이트보드 도구',
    type: 'original',
    createdAt: '2026-04-08T10:04:00Z',
    user: { name: '박서연' },
    reactions: [{ type: 'like', userId: 'u1' }],
    buildOnAsChild: [],
  },
  {
    id: 'i6',
    sessionId: 's1',
    userId: 'u4',
    title: '강의 요약 자동화',
    description: '녹강 AI 요약 서비스',
    type: 'original',
    createdAt: '2026-04-08T10:05:00Z',
    user: { name: '최지훈' },
    reactions: [
      { type: 'like', userId: 'u2' },
      { type: 'comment', userId: 'u1', content: '좋은 아이디어!' },
    ],
    buildOnAsChild: [],
  },
  {
    id: 'i7',
    sessionId: 's1',
    userId: 'u1',
    title: '팀 매칭 플랫폼',
    description: '프로젝트 팀원 매칭 서비스',
    type: 'original',
    createdAt: '2026-04-08T10:06:00Z',
    user: { name: '이교원' },
    reactions: [],
    buildOnAsChild: [],
  },
  {
    id: 'i8',
    sessionId: 's1',
    userId: 'u4',
    title: 'AI 코드 리뷰 챗봇',
    description: 'PR 자동 코드 리뷰 봇',
    type: 'build_on',
    createdAt: '2026-04-08T10:07:00Z',
    user: { name: '최지훈' },
    reactions: [{ type: 'like', userId: 'u3' }],
    buildOnAsChild: [{ parentIdea: { id: 'i2', title: 'AI 학습 도우미' } }],
  },
];

export default function DevPreviewPage({
  searchParams,
}: {
  searchParams: { screen?: string; tab?: string };
}) {
  if (process.env.NODE_ENV === 'production') {
    return <p>Not available in production.</p>;
  }

  const screen = searchParams.screen ?? 'dashboard-empty';

  if (screen === 'login') {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--tf-surface-background)' }}
      >
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1
              className="text-3xl font-bold tracking-tight mb-2"
              style={{ color: 'var(--tf-text-primary)' }}
            >
              TeamForge
            </h1>
            <p className="text-sm" style={{ color: 'var(--tf-text-muted)' }}>
              팀의 방향을 함께 만드는 킥오프 플랫폼
            </p>
          </div>
          <Card style={{ borderColor: 'var(--tf-border-subtle)' }}>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-center">로그인</CardTitle>
              <CardDescription className="text-center">
                소셜 계정으로 간편하게 시작하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 h-11 rounded-md border font-medium text-sm"
                style={{
                  minHeight: '44px',
                  borderColor: 'var(--tf-border-subtle)',
                  background: 'var(--tf-surface-card)',
                  color: 'var(--tf-text-primary)',
                }}
              >
                <Globe size={18} />
                Google로 계속하기
              </button>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 h-11 rounded-md border font-medium text-sm"
                style={{
                  minHeight: '44px',
                  borderColor: 'var(--tf-border-subtle)',
                  background: 'var(--tf-surface-card)',
                  color: 'var(--tf-text-primary)',
                }}
              >
                <GitBranch size={18} />
                GitHub으로 계속하기
              </button>
              <div
                className="w-full flex items-center justify-center gap-3 h-11 rounded-md font-medium text-sm opacity-50 cursor-not-allowed"
                style={{
                  minHeight: '44px',
                  background: 'var(--tf-kakao-yellow)',
                  color: 'var(--tf-kakao-text)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.695 1.593 5.065 4.01 6.515l-1.02 3.795a.375.375 0 0 0 .547.42l4.428-2.94A11.76 11.76 0 0 0 12 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
                </svg>
                카카오로 계속하기
                <Badge variant="secondary" className="ml-1 text-xs">준비 중</Badge>
              </div>
            </CardContent>
          </Card>
          <p className="text-center text-xs mt-6" style={{ color: 'var(--tf-text-muted)' }}>
            로그인하면 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다
          </p>
        </div>
      </main>
    );
  }

  if (screen === 'survey' || screen?.startsWith('survey-s')) {
    const section = screen.startsWith('survey-s') ? parseInt(screen.replace('survey-s', ''), 10) : 1;
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <SurveyClient
          teamId="mock-team-001"
          initialAnswers={{}}
          submitted={false}
          initialSection={section}
        />
      </div>
    );
  }

  const MOCK_RESULT_DATA = {
    axisScores: { 기획력: 72, 기술력: 88, 소통력: 60, 추진력: 78, 창의력: 55, 성장력: 90 },
    strengths: ['기술력', '성장력'],
    growthAreas: ['창의력', '소통력'],
    suggestedRole: 'architect',
    submitted: true,
    submittedAt: '2026-04-06T14:30:00Z',
    roleReaction: null as null,
    roleReactionNote: null as null,
    blockProfile: { strong: ['api', 'db', 'auth'], weak: ['devops', 'testing'] },
    roleGoodFit: ['아키텍트', '시스템 설계자', 'AI/데이터 엔지니어'],
    roleAvoid: ['인프라 담당'],
    aiSupportPlan: {
      primaryAreas: ['코드 초안', '디버깅', '코드 리뷰'],
      verificationLevel: 3,
      autonomousBlocks: ['api', 'db'],
    },
  };

  const MOCK_TEAM_MEMBERS = [
    { userId: 'u1', name: '이교원', image: null, role: 'leader' as const, submitted: true, confirmedRole: null, confirmedAt: null },
    { userId: 'u2', name: '김민준', image: null, role: 'member' as const, submitted: true, confirmedRole: '백엔드', confirmedAt: '2026-04-07T12:00:00Z' },
    { userId: 'u3', name: '박서연', image: null, role: 'member' as const, submitted: true, confirmedRole: null, confirmedAt: null },
    { userId: 'u4', name: '최지훈', image: null, role: 'member' as const, submitted: false, confirmedRole: null, confirmedAt: null },
  ];

  if (screen === 'result') {
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <ResultClient
          teamId="mock-team-001"
          data={MOCK_RESULT_DATA}
        />
      </div>
    );
  }

  if (screen === 'result-leader') {
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <ResultClient
          teamId="mock-team-001"
          myResult={{ ...MOCK_RESULT_DATA, myRole: 'leader' as const }}
          teamMembers={MOCK_TEAM_MEMBERS}
          memberResult={null}
          viewingUserId={null}
          myUserId="u1"
        />
      </div>
    );
  }

  if (screen === 'result-member-confirmed') {
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <ResultClient
          teamId="mock-team-001"
          myResult={{ ...MOCK_RESULT_DATA, myRole: 'member' as const }}
          teamMembers={null}
          memberResult={null}
          viewingUserId={null}
          initialFinalRole="백엔드"
        />
      </div>
    );
  }

  if (screen === 'kickoff-dashboard-progress') {
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <KickoffDashboardClient
          teamId="mock-team-001"
          data={{
            phase: 'survey_in_progress',
            surveyStats: { total: 4, submitted: 2, canProceed: false },
            members: [
              { userId: 'u1', name: '이교원', role: 'leader', submitted: true, image: null },
              { userId: 'u2', name: '김민준', role: 'member', submitted: true, image: null },
              { userId: 'u3', name: '박서연', role: 'member', submitted: false, image: null },
              { userId: 'u4', name: '최지훈', role: 'member', submitted: false, image: null },
              { userId: 'u5', name: '정예원', role: 'observer', submitted: null, image: null },
            ],
            myRole: 'leader',
            teamInsight: null,
          }}
        />
      </div>
    );
  }

  if (screen === 'kickoff-dashboard-complete') {
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <KickoffDashboardClient
          teamId="mock-team-001"
          data={{
            phase: 'survey_complete',
            surveyStats: { total: 4, submitted: 4, canProceed: true },
            members: [
              { userId: 'u1', name: '이교원', role: 'leader', submitted: true, image: null },
              { userId: 'u2', name: '김민준', role: 'member', submitted: true, image: null },
              { userId: 'u3', name: '박서연', role: 'member', submitted: true, image: null },
              { userId: 'u4', name: '최지훈', role: 'member', submitted: true, image: null },
              { userId: 'u5', name: '정예원', role: 'observer', submitted: null, image: null },
            ],
            myRole: 'leader',
            teamInsight: {
              avgAxisScores: { 기획력: 74, 기술력: 85, 소통력: 62, 추진력: 78, 창의력: 58, 성장력: 88 },
              topAxes: ['기술력', '성장력'],
              bottomAxis: '창의력',
              roleDistribution: { architect: 2, executor: 1, coordinator: 1 },
              blockCoverage: {
                ui: 'covered', api: 'covered', db: 'covered', auth: 'partial',
                devops: 'gap', testing: 'gap', docs: 'partial', pm: 'covered',
                data: 'partial', ai_feat: 'gap', realtime: 'gap',
              },
              teamCollabScore: 4,
              aiNeedBlocks: ['devops', 'testing', 'ai_feat', 'realtime'],
              teamRisks: [
                '배포/인프라, 테스트/QA 영역에 담당자가 없습니다',
                '4개 블록에서 AI 지원 계획이 필요합니다',
              ],
            },
          }}
        />
      </div>
    );
  }

  const MOCK_TOPICS: TopicItem[] = [
    {
      id: 'topic-001',
      title: '팀 협업 도구 개선 플랫폼',
      rationale:
        '팀원들의 기술 스택과 협업 경험을 종합하면, 기존 도구의 불편함을 해소하는 내부 플랫폼 구축이 가장 적합합니다.',
      tags: ['React', 'NestJS', 'WebSocket'],
      aiGenerated: true,
      confirmedAt: null,
      reactions: [
        { userId: 'u1', reaction: 'vote' },
        { userId: 'u2', reaction: 'vote' },
        { userId: 'u3', reaction: 'vote' },
      ],
      sourceIdeas: [
        { id: 'i1', title: '캠퍼스 중고거래 플랫폼', userName: '이교원' },
        { id: 'i4', title: '중고거래 + AI 가격 추천', userName: '김민준' },
      ],
    },
    {
      id: 'topic-002',
      title: 'AI 기반 코드 리뷰 자동화',
      rationale:
        '팀의 AI 역량과 백엔드 경험을 활용해 코드 품질 자동화 도구를 구축하면 높은 학습 효과를 얻을 수 있습니다.',
      tags: ['OpenAI', 'GitHub API', 'Node.js'],
      aiGenerated: true,
      confirmedAt: null,
      reactions: [{ userId: 'u4', reaction: 'vote' }],
      sourceIdeas: [
        { id: 'i2', title: 'AI 학습 도우미', userName: '김민준' },
        { id: 'i8', title: 'AI 코드 리뷰 챗봇', userName: '최지훈' },
      ],
    },
    {
      id: 'topic-003',
      title: '실시간 팀 성과 대시보드',
      rationale:
        '팀원들의 데이터 시각화 관심도와 프론트엔드 역량을 고려하면 실시간 대시보드가 효과적인 학습 프로젝트입니다.',
      tags: ['D3.js', 'PostgreSQL', 'Redis'],
      aiGenerated: true,
      confirmedAt: null,
      reactions: [],
    },
  ];

  if (screen === 'kickoff-topic-loading') {
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <TopicDecisionClient
          teamId="mock-team-001"
          initialData={{ status: 'pending', jobId: 'job-001' }}
          httpStatus={202}
          userRole="leader"
        />
      </div>
    );
  }

  if (screen === 'kickoff-topic-leader') {
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <TopicDecisionClient
          teamId="mock-team-001"
          initialData={{ topics: MOCK_TOPICS, confirmedTopic: null }}
          httpStatus={200}
          userRole="leader"
        />
      </div>
    );
  }

  if (screen === 'kickoff-topic-member') {
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <TopicDecisionClient
          teamId="mock-team-001"
          initialData={{ topics: MOCK_TOPICS, confirmedTopic: null }}
          httpStatus={200}
          userRole="member"
        />
      </div>
    );
  }

  // Dot voting UI (new)
  if (screen === 'kickoff-topic-voting') {
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <TopicDecisionClient
          teamId="mock-team-001"
          initialData={{ topics: MOCK_TOPICS, confirmedTopic: null }}
          httpStatus={200}
          userRole="member"
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Brainstorm previews
  // -------------------------------------------------------------------------

  // Brainstorm Stage 1: ideation (my 2 ideas, 3/4 submitted)
  if (screen === 'brainstorm-stage1') {
    const myIdeas = MOCK_BRAINSTORM_IDEAS.filter((i) => i.userId === 'u1');
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <BrainstormClient
          teamId="mock-team-001"
          session={MOCK_BRAINSTORM_SESSION}
          initialIdeas={myIdeas}
          teamCapability={MOCK_TEAM_CAPABILITY}
          userRole="leader"
          currentUserId="u1"
          submittedCount={3}
          totalMembers={4}
        />
      </div>
    );
  }

  // Brainstorm Stage 2: sharing (all 8 ideas, 2 build-ons)
  if (screen === 'brainstorm-stage2') {
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <BrainstormClient
          teamId="mock-team-001"
          session={{ ...MOCK_BRAINSTORM_SESSION, phase: 'sharing' }}
          initialIdeas={MOCK_SHARING_IDEAS}
          teamCapability={null}
          userRole="leader"
          currentUserId="u1"
          submittedCount={4}
          totalMembers={4}
        />
      </div>
    );
  }

  // Brainstorm Stage 3: clustering (loading)
  if (screen === 'brainstorm-stage3') {
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <BrainstormClient
          teamId="mock-team-001"
          session={{ ...MOCK_BRAINSTORM_SESSION, phase: 'clustering' }}
          initialIdeas={[]}
          teamCapability={null}
          userRole="leader"
          currentUserId="u1"
        />
      </div>
    );
  }

  if (screen === 'dashboard-empty') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--tf-surface-background)' }}>
        <AppHeader userName={MOCK_USER_NAME} />
        <DashboardClient
          userName={MOCK_USER_NAME}
          teams={MOCK_TEAMS_EMPTY}
          fetchError={null}
        />
      </div>
    );
  }

  if (screen === 'dashboard-teams') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--tf-surface-background)' }}>
        <AppHeader userName={MOCK_USER_NAME} />
        <DashboardClient
          userName={MOCK_USER_NAME}
          teams={MOCK_TEAMS}
          fetchError={null}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--tf-surface-background)' }}>
      <AppHeader userName={MOCK_USER_NAME} />
      <main
        className="flex items-center justify-center p-4"
        style={{ minHeight: 'calc(100vh - var(--tf-app-header-height))' }}
      >
        {screen === 'role-select' && <RoleSelectClient />}
        {screen === 'team-create' && <CreateTeamClient />}
        {screen === 'team-join' && <JoinTeamClient />}
      </main>
    </div>
  );
}
