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

export type ProfileConfidenceLevel = "high" | "medium" | "low";

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
  profileConfidence: ProfileConfidenceLevel;
  recommendedRoles: string[];
  positionPrediction: string;
  explanations?: {
    roleReason?: string;
    strengths?: string;
    improvements?: string;
  };
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

// Meeting hub types
export interface MeetingSummary {
  id: string;
  title: string | null;
  summary: string | null;
  analysisStatus: "pending" | "analyzing" | "done" | "failed";
  actionItemsCount: number;
  actionItemsDone: number;
  meetingDate: string;
  createdAt: string;
}

export interface MeetingDetail {
  id: string;
  teamId: string;
  title: string | null;
  rawContent: string | null; // null for observer
  summary: string | null;
  analysisStatus: "pending" | "analyzing" | "done" | "failed";
  nextAgenda: string[] | null;
  meetingDate: string;
  createdBy: string;
  actionItems: ActionItemResponse[];
}

export interface ActionItemResponse {
  id: string;
  description: string;
  assigneeName: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  status: "open" | "done";
  completedAt: string | null;
}

export interface CreateMeetingRequest {
  teamId: string;
  title?: string;
  rawContent: string;
  meetingDate?: string;
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
