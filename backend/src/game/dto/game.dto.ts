import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';
import { PredictionType } from '../../game-engine/interfaces/game-config.interface';

export class StartGameDto {
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  betAmount: number;

  // Optional: if the player's client wants to supply its own client seed
  // (so it can be chosen before the server commits to anything, strengthening
  // the provably-fair guarantee). If omitted, the server generates one.
  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientSeed?: string;
}

export class SubmitGuessDto {
  @IsUUID()
  gameId: string;

  @IsEnum(PredictionType)
  prediction: PredictionType;
}

export class CashoutDto {
  @IsUUID()
  gameId: string;
}
