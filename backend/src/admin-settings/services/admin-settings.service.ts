import { BadRequestException, Injectable } from '@nestjs/common';
import { AdminSettingsRepository } from '../interfaces/admin-settings-repository.interface';
import { AceMode, EqualRule, MultiplierTableEntry } from '../../game-engine/interfaces/game-config.interface';
import { DEFAULT_ACE_MODE, DEFAULT_EQUAL_RULE, DEFAULT_MULTIPLIER_TABLE } from '../../game-engine/constants/multiplier-table.constant';
import { assertMonotonicMultiplierTable } from '../../game-engine/services/multiplier.service';

/** The known, documented AdminSettings key namespace. Anything not listed here is a bug, not a feature — this is deliberately not "anything goes." */
export const ADMIN_SETTINGS_KEYS = {
  ACE_MODE: 'game.aceMode',
  EQUAL_RULE: 'game.equalRule',
  MULTIPLIER_TABLE: 'game.multiplierTable',
  /** Informational target for the analytics dashboard — the multiplier table is what actually determines real RTP; this is what the admin *intends* it to approximate. */
  TARGET_RTP_PERCENT: 'game.targetRtpPercent',
} as const;

@Injectable()
export class AdminSettingsService {
  constructor(private readonly repository: AdminSettingsRepository) {}

  async getAceMode(): Promise<AceMode> {
    const record = await this.repository.get(ADMIN_SETTINGS_KEYS.ACE_MODE);
    return (record?.value as AceMode) ?? AceMode[DEFAULT_ACE_MODE as keyof typeof AceMode];
  }

  async setAceMode(value: AceMode, updatedBy: string): Promise<void> {
    await this.repository.set(ADMIN_SETTINGS_KEYS.ACE_MODE, value, updatedBy, 'Whether Ace is treated as high (14) or low (1) for card comparisons.');
  }

  async getEqualRule(): Promise<EqualRule> {
    const record = await this.repository.get(ADMIN_SETTINGS_KEYS.EQUAL_RULE);
    return (record?.value as EqualRule) ?? EqualRule[DEFAULT_EQUAL_RULE as keyof typeof EqualRule];
  }

  async setEqualRule(value: EqualRule, updatedBy: string): Promise<void> {
    await this.repository.set(ADMIN_SETTINGS_KEYS.EQUAL_RULE, value, updatedBy, 'What happens when the current and next card have equal rank: PUSH, LOSS, or REDRAW.');
  }

  async getMultiplierTable(): Promise<MultiplierTableEntry[]> {
    const record = await this.repository.get(ADMIN_SETTINGS_KEYS.MULTIPLIER_TABLE);
    return (record?.value as MultiplierTableEntry[]) ?? [...DEFAULT_MULTIPLIER_TABLE];
  }

  async setMultiplierTable(table: MultiplierTableEntry[], updatedBy: string): Promise<void> {
    // Fail loudly before persisting a table that would break MultiplierService at game-start time —
    // an admin typo here should reject immediately, not surface as a broken game an hour later.
    try {
      assertMonotonicMultiplierTable(table);
    } catch (err) {
      // assertMonotonicMultiplierTable is framework-agnostic (game-engine
      // has no @nestjs/common dependency by design — see phase 1) and
      // throws a plain Error; this is the boundary where that gets
      // translated into a proper HTTP 400 instead of an unhandled 500.
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid multiplier table');
    }
    await this.repository.set(ADMIN_SETTINGS_KEYS.MULTIPLIER_TABLE, table, updatedBy, 'Payout multiplier per correct-guess streak. Must be strictly increasing.');
  }

  async getTargetRtpPercent(): Promise<number | null> {
    const record = await this.repository.get(ADMIN_SETTINGS_KEYS.TARGET_RTP_PERCENT);
    return (record?.value as number) ?? null;
  }

  async setTargetRtpPercent(value: number, updatedBy: string): Promise<void> {
    if (value <= 0 || value > 100) {
      throw new BadRequestException('Target RTP percent must be between 0 and 100');
    }
    await this.repository.set(
      ADMIN_SETTINGS_KEYS.TARGET_RTP_PERCENT,
      value,
      updatedBy,
      'Informational target return-to-player percentage the multiplier table is intended to approximate — not enforced automatically.',
    );
  }

  async getAll() {
    return this.repository.getAll();
  }
}
