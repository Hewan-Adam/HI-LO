"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvablyFairService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
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
let ProvablyFairService = class ProvablyFairService {
    generateServerSeed() {
        return crypto.randomBytes(32).toString('hex');
    }
    generateClientSeed() {
        return crypto.randomBytes(16).toString('hex');
    }
    hashServerSeed(serverSeed) {
        return crypto.createHash('sha256').update(serverSeed).digest('hex');
    }
    /**
     * Deterministically derives `count` floats in [0, 1) from the given seeds.
     * Same inputs always produce the same output, in any language/runtime,
     * since it only relies on standard HMAC-SHA256.
     */
    generateFloats(serverSeed, clientSeed, nonce, count) {
        const floats = [];
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
    verifyServerSeed(serverSeed, publishedHash) {
        return this.hashServerSeed(serverSeed) === publishedHash;
    }
};
exports.ProvablyFairService = ProvablyFairService;
exports.ProvablyFairService = ProvablyFairService = __decorate([
    (0, common_1.Injectable)()
], ProvablyFairService);
