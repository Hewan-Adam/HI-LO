import 'reflect-metadata';
import { DeckService } from '../src/game-engine/services/deck.service';
import { ProvablyFairService } from '../src/game-engine/services/provably-fair.service';
import { MultiplierService } from '../src/game-engine/services/multiplier.service';
import { CardComparatorService } from '../src/game-engine/services/card-comparator.service';
import { GameEngineService } from '../src/game-engine/services/game-engine.service';
import { AceMode, EqualRule, PredictionType } from '../src/game-engine/interfaces/game-config.interface';

function line() {
  console.log('-'.repeat(72));
}

function main() {
  const provablyFair = new ProvablyFairService();
  const deckService = new DeckService(provablyFair);
  const multiplierService = new MultiplierService();
  const comparator = new CardComparatorService();
  const engine = new GameEngineService(deckService, provablyFair, multiplierService, comparator);

  line();
  console.log('1) START GAME');
  line();

  let state = engine.startGame({
    userId: 'user-123',
    betAmount: 10,
    config: { aceMode: AceMode.HIGH, equalRule: EqualRule.PUSH },
  });

  console.log(`Game ID:          ${state.gameId}`);
  console.log(`Server seed hash: ${state.serverSeedHash}  (published up-front; seed itself withheld)`);
  console.log(`Client seed:      ${state.clientSeed}`);
  console.log(`Current card:     ${engine.getCurrentCard(state).code}`);

  line();
  console.log('2) PLAY UNTIL CASHOUT OR LOSS (auto-picks the mathematically correct side each turn for the demo)');
  line();

  let turn = 0;
  while (state.status === 'ACTIVE' && turn < 10) {
    turn += 1;
    const currentCard = engine.getCurrentCard(state);
    const currentRank = comparator.effectiveRank(currentCard, state.config.aceMode);
    // For a deterministic demo we predict based on the actual midpoint rank (7),
    // just to walk through a realistic multi-turn game instead of a coinflip.
    const prediction = currentRank <= 7 ? PredictionType.HIGHER : PredictionType.LOWER;

    const outcome = engine.submitGuess(state, prediction);
    state = outcome.state;

    console.log(
      `Turn ${turn}: current=${currentCard.code} predicted=${prediction} revealed=${outcome.revealedCardCode} ` +
        `result=${outcome.result} streak=${state.streak} multiplier=${state.currentMultiplier}x`,
    );

    if (outcome.gameOver) break;
    if (turn === 3) {
      console.log('   -> Player decides to cash out after turn 3.');
      break;
    }
  }

  if (state.status === 'ACTIVE') {
    const cashoutResult = engine.cashout(state);
    state = cashoutResult.state;
    console.log(`\nCashed out. Payout = ${cashoutResult.payout} (bet ${state.betAmount} x ${state.moves[state.moves.length - 1].multiplierAfter})`);
  } else {
    console.log(`\nGame ended with status=${state.status}, payout=${state.payout}`);
  }

  line();
  console.log('3) PROVABLY FAIR VERIFICATION');
  line();

  const proof = engine.getFairnessProof(state);
  console.log(`Revealed server seed: ${proof.serverSeed}`);
  console.log(`Dealt cards in order: ${proof.dealtCardCodes.join(', ')}`);

  const isValid = engine.verifyFairness(proof);
  console.log(`\nIndependent recomputation of the deck from (serverSeed, clientSeed, nonce) matches what was dealt: ${isValid}`);

  // Tamper check: prove verification actually fails on a doctored proof.
  const tamperedProof = { ...proof, dealtCardCodes: [...proof.dealtCardCodes.slice(0, -1), 'AS'] };
  const tamperedValid = engine.verifyFairness(tamperedProof);
  console.log(`Verification of a tampered card sequence correctly fails: ${!tamperedValid}`);

  line();
  console.log('4) MULTIPLIER TABLE SANITY CHECK (including extrapolation beyond streak 8)');
  line();
  for (const streak of [1, 2, 4, 8, 9, 12]) {
    console.log(`streak=${streak} -> multiplier=${multiplierService.getMultiplier(streak)}x`);
  }
}

main();
