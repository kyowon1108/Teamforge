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
import { Globe, GitBranch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
