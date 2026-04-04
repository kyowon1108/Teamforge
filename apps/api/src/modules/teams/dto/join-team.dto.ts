export class JoinTeamDto {
  inviteCode!: string;
  role?: "member" | "observer";
}
