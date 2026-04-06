import { redirect } from 'next/navigation';

// role-select는 더 이상 독립 페이지로 사용되지 않습니다.
// 역할 선택은 팀 참가(team/join) 과정에서 이뤄집니다.
// 기존 북마크/링크 호환을 위해 /dashboard로 redirect합니다.
export default function RoleSelectPage() {
  redirect('/dashboard');
}
