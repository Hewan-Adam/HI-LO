import { Body, Controller, HttpCode, HttpStatus, Post, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './services/auth.service';
import { TelegramLoginDto, RefreshTokenDto } from './dto/auth.dto';
import { Public, CurrentUser } from './decorators/auth.decorators';
import { AccessTokenPayload } from './interfaces/auth-types';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Tighter than the app-wide default: these are @Public (pre-auth), so the
  // throttle guard always tracks by IP here regardless of guard ordering —
  // exactly what's needed to slow down credential/initData brute-forcing.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('telegram-login')
  @HttpCode(HttpStatus.OK)
  async telegramLogin(@Body() dto: TelegramLoginDto) {
    const { user, tokens } = await this.authService.telegramLogin(dto.initData);
    return {
      user: { id: user.id, telegramId: user.telegramId, username: user.username, role: user.role },
      ...tokens,
    };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    const { user, tokens } = await this.authService.refresh(dto.refreshToken);
    return {
      user: { id: user.id, telegramId: user.telegramId, username: user.username, role: user.role },
      ...tokens,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
  }

  // Not @Public — exercises JwtAuthGuard, proving a valid access token is required.
  @Get('me')
  me(@CurrentUser() user: AccessTokenPayload) {
    return { id: user.sub, telegramId: user.telegramId, role: user.role };
  }
}
