export const FEATURE_FLAGS = {
  KAKAO_AUTH: Boolean(process.env.KAKAO_CLIENT_ID)
} as const;
