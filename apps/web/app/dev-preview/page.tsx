/**
 * DEV ONLY — 스크린샷/Figma 캡처용 미리보기 라우트.
 * 프로덕션 빌드에서는 제거할 것.
 */
import RoleSelectClient from '../role-select/role-select-client';
import TeamSetupClient from '../team/join-or-create/team-setup-client';

export default function DevPreviewPage({
  searchParams,
}: {
  searchParams: { screen?: string; tab?: string };
}) {
  if (process.env.NODE_ENV === 'production') {
    return <p>Not available in production.</p>;
  }

  const screen = searchParams.screen ?? 'role-select';
  const tab = (searchParams.tab as 'create' | 'join') ?? 'create';

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--tf-surface-background)' }}
    >
      {screen === 'role-select' && <RoleSelectClient />}
      {screen === 'team-setup' && <TeamSetupClient initialTab={tab} />}
    </main>
  );
}
