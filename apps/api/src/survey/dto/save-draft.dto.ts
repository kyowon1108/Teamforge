export class SaveDraftDto {
  answers!: Record<string, unknown>;

  metadata?: {
    draftStep?: number;
    autosavedAt?: string;
    lastEditedByRole?: 'leader' | 'member';
  };
}
