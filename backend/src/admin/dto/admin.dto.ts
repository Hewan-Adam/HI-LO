import { IsArray, IsEnum, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AceMode, EqualRule } from '../../game-engine/interfaces/game-config.interface';

export class BanUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateAceModeDto {
  @IsEnum(AceMode)
  aceMode: AceMode;
}

export class UpdateEqualRuleDto {
  @IsEnum(EqualRule)
  equalRule: EqualRule;
}

export class MultiplierTableEntryDto {
  @IsNumber()
  @IsPositive()
  streak: number;

  @IsNumber()
  @IsPositive()
  multiplier: number;
}

export class UpdateMultiplierTableDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultiplierTableEntryDto)
  table: MultiplierTableEntryDto[];
}

export class UpdateTargetRtpDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  percent: number;
}
