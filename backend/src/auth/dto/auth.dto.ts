import { IsString, MinLength } from 'class-validator';

export class TelegramLoginDto {
  /** The raw `window.Telegram.WebApp.initData` string from the Mini App client. */
  @IsString()
  @MinLength(1)
  initData!: string;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
