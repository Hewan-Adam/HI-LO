import { Injectable } from '@nestjs/common';
import { AceMode, EqualRule, MultiplierTableEntry } from '../../game-engine/interfaces/game-config.interface';
import { DEFAULT_ACE_MODE, DEFAULT_EQUAL_RULE, DEFAULT_MULTIPLIER_TABLE } from '../../game-engine/constants/multiplier-table.constant';
import { AdminSettingsService } from '../../admin-settings/services/admin-settings.service';

export const GAME_RULES_PROVIDER = Symbol('GAME_RULES_PROVIDER');

/**
 * Deliberately NOT part of StartGameDto: Ace mode, equal-card rule, and the
 * multiplier table are house rules, configured by admins for everyone —
 * never chosen by an individual player per bet. If a player could pick
 * AceMode/EqualRule on their own request, they could simply always select
 * whichever configuration currently favors them, silently inverting the
 * house edge the admin dashboard is meant to control. GameApiService reads
 * these from this provider, not from client input.
 */
export interface GameRulesProvider {
  getAceMode(): Promise<AceMode>;
  getEqualRule(): Promise<EqualRule>;
  getMultiplierTable(): Promise<MultiplierTableEntry[]>;
}

/**
 * Phase 4 default: returns the spec's static defaults. Kept around (and
 * still used by the demo scripts and any test that doesn't care about admin
 * configurability) even now that AdminSettingsGameRulesProvider exists.
 */
@Injectable()
export class DefaultGameRulesProvider implements GameRulesProvider {
  async getAceMode(): Promise<AceMode> {
    return AceMode[DEFAULT_ACE_MODE as keyof typeof AceMode];
  }

  async getEqualRule(): Promise<EqualRule> {
    return EqualRule[DEFAULT_EQUAL_RULE as keyof typeof EqualRule];
  }

  async getMultiplierTable(): Promise<MultiplierTableEntry[]> {
    return [...DEFAULT_MULTIPLIER_TABLE];
  }
}

/**
 * Phase 5 (admin dashboard) real implementation: reads the same three
 * values live from `AdminSettings` via `AdminSettingsService`, falling back
 * to the spec's defaults until an admin has set them for the first time.
 * `GameApiService` needed zero changes to start using this — it only ever
 * depended on the `GameRulesProvider` interface, which is exactly the point
 * of having it.
 */
@Injectable()
export class AdminSettingsGameRulesProvider implements GameRulesProvider {
  constructor(private readonly adminSettings: AdminSettingsService) {}

  async getAceMode(): Promise<AceMode> {
    return this.adminSettings.getAceMode();
  }

  async getEqualRule(): Promise<EqualRule> {
    return this.adminSettings.getEqualRule();
  }

  async getMultiplierTable(): Promise<MultiplierTableEntry[]> {
    return this.adminSettings.getMultiplierTable();
  }
}
