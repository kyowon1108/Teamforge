'use server';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';

export interface TeamSummary {
  teamId: string;
  name: string;
  role: 'leader' | 'member' | 'observer';
  memberCount: number;
}

export async function listTeamsAction(): Promise<{
  error: string | null;
  teams: TeamSummary[];
}> {
  const session = await auth();
  if (!session) return { error: '로그인이 필요합니다.', teams: [] };

  try {
    const res = await apiFetch('/api/teams');
    if (!res.ok) return { error: '팀 목록을 불러오지 못했습니다.', teams: [] };
    const data = (await res.json()) as TeamSummary[];
    return { error: null, teams: Array.isArray(data) ? data : [] };
  } catch {
    return { error: '네트워크 오류가 발생했습니다.', teams: [] };
  }
}
