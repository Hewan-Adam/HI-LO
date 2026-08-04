import { Module } from '@nestjs/common';
import { DeckService } from './services/deck.service';
import { ProvablyFairService } from './services/provably-fair.service';
import { MultiplierService } from './services/multiplier.service';
import { CardComparatorService } from './services/card-comparator.service';
import { GameEngineService } from './services/game-engine.service';

/**
 * Phase 1 module: pure game-engine domain logic, no persistence.
 * The upcoming persistence phase will add a GameRepository (Prisma-backed)
 * and a GameController/GameApiService that load/save GameState and wrap
 * each state mutation in a DB transaction alongside the matching wallet
 * debit/credit — this module stays framework-agnostic on purpose.
 */
@Module({
  providers: [DeckService, ProvablyFairService, MultiplierService, CardComparatorService, GameEngineService],
  exports: [DeckService, ProvablyFairService, MultiplierService, CardComparatorService, GameEngineService],
})
export class GameEngineModule {}
