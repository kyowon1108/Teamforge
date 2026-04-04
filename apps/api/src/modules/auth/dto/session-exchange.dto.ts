export class SessionExchangeDto {
  secret!: string;
  user!: {
    id?: string;
    email: string;
    name: string;
    image?: string | null;
    provider?: string;
    providerAccountId?: string;
  };
}
