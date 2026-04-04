export const FEATURE_FLAGS = {
  kakaoLogin: !!(process.env.KAKAO_CLIENT_ID),
  slackIntegration: !!(process.env.SLACK_CLIENT_ID),
  notionIntegration: !!(process.env.NOTION_CLIENT_ID),
} as const;
