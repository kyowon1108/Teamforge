/**
 * DEV ONLY — 스크린샷/Figma 캡처용 미리보기 라우트.
 * 프로덕션 빌드에서는 제거할 것.
 */
import RoleSelectClient from '../role-select/role-select-client';
import CreateTeamClient from '../team/create/create-team-client';
import JoinTeamClient from '../team/join/join-team-client';
import DashboardClient from '../dashboard/dashboard-client';
import SurveyClient from '../team/[teamId]/survey/survey-client';

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

  if (screen === 'survey') {
    return (
      <SurveyClient
        teamId="mock-team-001"
        initialAnswers={{}}
        submitted={false}
      />
    );
  }

  const centered = (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--tf-surface-background)' }}
    >
      {screen === 'role-select' && <RoleSelectClient />}
      {screen === 'team-create' && <CreateTeamClient />}
      {screen === 'team-join' && <JoinTeamClient />}
    </main>
  );

  if (screen === 'dashboard-empty') {
    return (
      <DashboardClient
        userName="이교원"
        teams={MOCK_TEAMS_EMPTY}
        fetchError={null}
      />
    );
  }

  if (screen === 'dashboard-teams') {
    return (
      <DashboardClient
        userName="이교원"
        teams={MOCK_TEAMS}
        fetchError={null}
      />
    );
  }

  return centered;
}
