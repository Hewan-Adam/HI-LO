import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { TelegramVerificationService } from './services/telegram-verification.service';
import { PrismaAuthRepository } from './repositories/prisma-auth.repository';
import { AUTH_REPOSITORY } from './interfaces/auth-repository.interface';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { loadAuthConfig } from './interfaces/auth-config.interface';

const AUTH_CONFIG = loadAuthConfig();

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: TokenService,
      useFactory: () =>
        new TokenService(
          AUTH_CONFIG.accessTokenSecret,
          AUTH_CONFIG.refreshTokenSecret,
          AUTH_CONFIG.accessTokenTtlSeconds,
          AUTH_CONFIG.refreshTokenTtlSeconds,
        ),
    },
    {
      provide: TelegramVerificationService,
      useFactory: () => new TelegramVerificationService(AUTH_CONFIG.telegramBotToken, AUTH_CONFIG.telegramAuthMaxAgeSeconds),
    },
    { provide: AUTH_REPOSITORY, useClass: PrismaAuthRepository },
    // JwtAuthGuard and RolesGuard are provided here (so their constructor
    // deps — TokenService, Reflector — resolve from this module's scope)
    // but deliberately NOT registered as APP_GUARD here. Global guard
    // execution order across multiple APP_GUARD registrations spread
    // across different modules follows Nest's module-resolution order,
    // which is hard to reason about precisely — and here the order
    // actually matters: UserOrIpThrottlerGuard needs to run AFTER
    // JwtAuthGuard (so req.user is populated) and the app needs
    // JwtAuthGuard to run before RolesGuard regardless. Rather than split
    // three interdependent guards across two modules and hope Nest
    // resolves them in the right order, AppModule registers all three as
    // APP_GUARD itself, in one explicit array, in the exact order intended.
    JwtAuthGuard,
    RolesGuard,
    Reflector,
  ],
  exports: [AuthService, TokenService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
