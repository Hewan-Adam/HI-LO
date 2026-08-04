import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Implements the provably-fair primitives required by the spec:
 *   Server Seed + Client Seed + Nonce -> SHA-256 -> deterministic shuffle
 *
 * Design (same family of algorithm used by major provably-fair casino
 * platforms — an HMAC-SHA256 cursor-based float stream):
 *
 *   1. Server generates a secret `serverSeed` and publishes only
 *      SHA-256(serverSeed) before the game starts. The player cannot predict
 *      the deck from the hash alone.
 *   2. The player supplies (or is assigned) a `clientSeed`. Because the
 *      client seed is chosen by/visible to the player, they can prove the
 *      server didn't have a chance to react to it either.
 *   3. Deck order is derived by repeatedly computing
 *      HMAC-SHA256(key=serverSeed, message=`${clientSeed}:${nonce}:${cursor}`)
 *      and slicing the digest into 32-bit big-endian chunks, each normalized
 *      to a float in [0, 1). This produces an effectively unlimited,
 *      deterministic stream of pseudo-random floats.
 *   4. After the game ends, the server reveals `serverSeed`. Anyone can
 *      recompute steps 1-3 and confirm the deck (and therefore every card
 *      dealt) exactly matches what was actually played.
 */
@Injectable()
export class ProvablyFairService {
  generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateClientSeed(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  hashServerSeed(serverSeed: string): string {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
  }

  /**
   * Deterministically derives `count` floats in [0, 1) from the given seeds.
   * Same inputs always produce the same output, in any language/runtime,
   * since it only relies on standard HMAC-SHA256.
   */
  generateFloats(serverSeed: string, clientSeed: string, nonce: number, count: number): number[] {
    const floats: number[] = [];
    let cursor = 0;

    while (floats.length < count) {
      const hmac = crypto.createHmac('sha256', serverSeed);
      hmac.update(`${clientSeed}:${nonce}:${cursor}`);
      const digest = hmac.digest(); // 32 bytes -> up to 8 uint32 chunks

      for (let offset = 0; offset + 4 <= digest.length && floats.length < count; offset += 4) {
        const uint32 = digest.readUInt32BE(offset);
        floats.push(uint32 / 0x100000000); // normalize to [0, 1)
      }

      cursor += 1;
    }

    return floats;
  }

  /** Confirms a revealed server seed actually matches the hash published before the game started. */
  verifyServerSeed(serverSeed: string, publishedHash: string): boolean {
    return this.hashServerSeed(serverSeed) === publishedHash;
  }
}
