import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GameApiService } from './services/game-api.service';
import { StartGameDto, SubmitGuessDto, CashoutDto } from './dto/game.dto';
import { CurrentUser } from '../auth/decorators/auth.decorators';
import { AccessTokenPayload } from '../auth/interfaces/auth-types';

// No legitimate human plays faster than this — a tighter limit than the
// app-wide default doubles as a cheap first line of defense against a
// scripted client hammering the game loop, on top of being plain anti-spam.
const GAMEPLAY_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

@Controller('game')
export class GameController {
  constructor(private readonly gameApiService: GameApiService) {}

  @Throttle(GAMEPLAY_THROTTLE)
  @Post('start')
  async start(@CurrentUser() user: AccessTokenPayload, @Body() dto: StartGameDto) {
    return this.gameApiService.startGame(user.sub, dto.betAmount, dto.clientSeed);
  }

  @Throttle(GAMEPLAY_THROTTLE)
  @Post('guess')
  async guess(@CurrentUser() user: AccessTokenPayload, @Body() dto: SubmitGuessDto) {
    return this.gameApiService.submitGuess(user.sub, dto.gameId, dto.prediction);
  }

  @Throttle(GAMEPLAY_THROTTLE)
  @Post('cashout')
  async cashout(@CurrentUser() user: AccessTokenPayload, @Body() dto: CashoutDto) {
    return this.gameApiService.cashout(user.sub, dto.gameId);
  }

  @Get('history')
  async history(@CurrentUser() user: AccessTokenPayload, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.gameApiService.getHistory(user.sub, limit ? Number(limit) : undefined, offset ? Number(offset) : undefined);
  }

  @Get(':gameId/fairness')
  async fairness(@CurrentUser() user: AccessTokenPayload, @Param('gameId') gameId: string) {
    return this.gameApiService.getFairnessProof(user.sub, gameId);
  }
}
