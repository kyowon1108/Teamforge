export class CreateTeamDto {
  name!: string;
  description?: string;
  expectedSize!: 2 | 3 | 4 | 5 | 6;
}
