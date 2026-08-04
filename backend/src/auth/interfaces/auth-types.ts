export enum Role {
  PLAYER = 'PLAYER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface AccessTokenPayload {
  sub: string; // userId
  role: Role;
  telegramId: string;
  iat: number;
  exp: number;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string; // userId
  jti: string; // unique token id — this is what gets hashed and stored/looked-up in the DB
  familyId: string;
  iat: number;
  exp: number;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface AuthenticatedUser {
  id: string;
  telegramId: string;
  username?: string;
  role: Role;
  isBanned: boolean;
}

/** The parsed, verified fields Telegram's WebApp `initData` decodes to. */
export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}
