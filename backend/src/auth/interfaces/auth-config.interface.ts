export interface AuthConfig {
  telegramBotToken: string;
  /** Max age (seconds) of Telegram's `auth_date` before initData is considered stale/replayed. */
  telegramAuthMaxAgeSeconds: number;
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
}

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const required = (key: string): string => {
    const value = env[key];
    if (!value) throw new Error(`Missing required environment variable: ${key}`);
    return value;
  };

  return {
    telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
    telegramAuthMaxAgeSeconds: Number(env.TELEGRAM_AUTH_MAX_AGE_SECONDS ?? 86400), // 24h
    accessTokenSecret: required('JWT_ACCESS_SECRET'),
    refreshTokenSecret: required('JWT_REFRESH_SECRET'),
    accessTokenTtlSeconds: Number(env.JWT_ACCESS_TTL_SECONDS ?? 900), // 15 min
    refreshTokenTtlSeconds: Number(env.JWT_REFRESH_TTL_SECONDS ?? 2592000), // 30 days
  };
}
