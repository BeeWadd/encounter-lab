import { simulateBattle } from "./battle";
import { createSeededRandom } from "./random";
import type { EncounterInput, Side } from "./types";
export function simulateBatch(
    encounter: EncounterInput,
    trialCount: number,
    roundLimit: number,
    seed: string
) {
    if (!Number.isSafeInteger(trialCount) || trialCount < 1) {
        throw new Error("The trial count must be a positive integer.");
    }

    // Start one random sequence for the whole batch. Each trial picks up 
    // where the previous one left off, so recreating the seed every trial
    // would repeat the same battle.
    const random = createSeededRandom(seed);
    const wins: Record<Side, number> = { a: 0, b: 0 };
    let unresolvedTrials = 0;
    let completedRoundTotal = 0;

    for (let trial = 0; trial < trialCount; trial++) {
        const result = simulateBattle(encounter, roundLimit, random);

        if (result.winner === null) {
            unresolvedTrials++;
            continue;
        }

        wins[result.winner]++;
        completedRoundTotal += result.rounds;
    }

    const completedTrials = trialCount - unresolvedTrials;

    return {
        wins,
        unresolvedTrials,
        // Use all trials as the denominator so unresolved trials stay visible.
        winPercent: {
            a: (wins.a / trialCount) * 100,
            b: (wins.b / trialCount) * 100,
        },
        // With no completed battles, there is no duration to average.
        averageCompletedRounds: completedTrials === 0 ? null : completedRoundTotal / completedTrials,
    };
}