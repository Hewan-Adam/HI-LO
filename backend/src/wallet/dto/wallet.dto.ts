import { IsNumber, IsOptional, IsPositive, IsString, IsUUID, IsBoolean, MaxLength } from 'class-validator';

export class DepositDto {
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class WithdrawDto {
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;
}

export class PlaceBetDto {
  @IsUUID()
  gameId: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsBoolean()
  useBonusFirst?: boolean;
}

export class SettleCashoutDto {
  @IsUUID()
  gameId: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  payoutAmount: number;
}

export class BonusCreditDto {
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
