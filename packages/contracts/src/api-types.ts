// Shared API response/request types used by both web and api packages

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  githubUrl: string | null;
  isNewUser: boolean;
}

export interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  inviteUrl: string;
  inviteExpiresAt: string | null;
  memberCount: number;
  leaderUserId: string;
  expectedSize: number;
}

export interface TeamMember {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: "leader" | "member" | "observer";
  surveyCompleted: boolean;
}

export interface PersonalResult {
  userId: string;
  skillVector: {
    backend: number;
    frontend: number;
    database: number;
    devops: number;
    aiMl: number;
    design: number;
  };
  experienceScore: number;
  reliabilityScore: number;
  recommendedRoles: string[];
  positionPrediction: string;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

// Error codes
export type ApiErrorCode =
  | "OAUTH_STATE_MISMATCH"
  | "OAUTH_CODE_EXPIRED"
  | "EMAIL_ALREADY_EXISTS"
  | "PROVIDER_UNAVAILABLE"
  | "REFRESH_TOKEN_EXPIRED"
  | "TEAM_NAME_DUPLICATE"
  | "INVITE_CODE_NOT_FOUND"
  | "INVITE_CODE_EXPIRED"
  | "ALREADY_TEAM_MEMBER"
  | "TEAM_FULL"
  | "USER_NOT_IN_TEAM"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "INTERNAL_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  statusCode: number;
}
