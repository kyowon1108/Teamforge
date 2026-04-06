'use server';

import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';
import { redirect } from 'next/navigation';

export async function saveDraftAction(
  teamId: string,
  answers: Record<string, unknown>,
): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  try {
    const res = await apiFetch(`/api/teams/${teamId}/survey/draft`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) {
      return { error: '임시저장에 실패했습니다.' };
    }
    return { error: null };
  } catch {
    return { error: '네트워크 오류가 발생했습니다.' };
  }
}

export async function submitSurveyAction(
  teamId: string,
  answers: Record<string, unknown>,
): Promise<{ error: string | null; jobId?: string }> {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  try {
    const res = await apiFetch(`/api/teams/${teamId}/survey/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) {
      return { error: '제출에 실패했습니다.' };
    }
    const data = (await res.json()) as { jobId?: string };
    return { error: null, jobId: data.jobId };
  } catch {
    return { error: '네트워크 오류가 발생했습니다.' };
  }
}
