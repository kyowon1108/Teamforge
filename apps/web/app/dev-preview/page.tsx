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
import AppHeader from '@/components/layout/AppHeader';

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

export default function DevPreviewPage({
  searchParams,
}: {
  searchParams: { screen?: string; tab?: string };
}) {
  if (process.env.NODE_ENV === 'production') {
    return <p>Not available in production.</p>;
  }

  const screen = searchParams.screen ?? 'dashboard-empty';

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

  if (screen === 'result') {
    return (
      <div>
        <AppHeader userName={MOCK_USER_NAME} />
        <ResultClient
          teamId="mock-team-001"
          data={{
            axisScores: { 기획력: 72, 기술력: 88, 소통력: 60, 추진력: 78, 창의력: 55, 성장력: 90 },
            strengths: ['기술력', '성장력'],
            growthAreas: ['창의력', '소통력'],
            suggestedRole: 'architect',
            submitted: true,
            submittedAt: '2026-04-06T14:30:00Z',
          }}
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
          }}
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
