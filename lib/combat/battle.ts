import { resolveAttack } from "./attack";
import { prepareTurnOrder, type BattleCombatant } from "./initiative";
import type { RandomSource } from "./random";
import { selectTarget } from "./targeting";
import type { EncounterInput, Side } from "./types";

export interface BattleResult {
    winner: Side | null;
    rounds: number;
    remainingHP: Record<Side, number>;
    knockouts: Record<Side, number>;
}

function summarizeBattle(
    combatants: readonly BattleCombatant[],
    winner: Side | null,
    rounds: number
): BattleResult {
    // Keep per-side totals so the batch simulator can aggregate the trial.
    const remainingHP = { a: 0, b: 0 };
    const knockouts = { a: 0, b: 0 };

    for (const combatant of combatants) {
        remainingHP[combatant.side] += combatant.currentHP;

        if (combatant.currentHP === 0) {
            knockouts[combatant.side]++;
        }
    }

    return { winner, rounds, remainingHP, knockouts };
}

export function simulateBattle(
    encounter: EncounterInput,
    roundLimit: number,
    random: RandomSource
): BattleResult {
    if (!Number.isSafeInteger(roundLimit) || roundLimit < 1) {
        throw new Error("The round limit must be a positive integer.");
    }

    if (!encounter.combatants.some((combatant) => combatant.side === "a") || !encounter.combatants.some((combatant) => combatant.side === "b")) {
        throw new Error("A battle needs a combatant on each side");
    }

    // Roll initiative once and reuse this order for every round.
    const turnOrder = prepareTurnOrder(encounter.combatants, random);

    for (let round = 1; round <= roundLimit; round++) {
        for (const attacker of turnOrder) {
            // An earlier turn may have knocked this combatant out.
            if (attacker.currentHP === 0) {
                continue;
            }

            const policy = attacker.side === "a" ? encounter.sideATargeting : encounter.sideBTargeting;

            for (let attack = 0; attack < attacker.attacksPerTurn; attack++) {
                // Pick again for every attack because HP and eligibility can change.
                const target = selectTarget(turnOrder, attacker.side, policy, random);

                if (!target) {
                    return summarizeBattle(turnOrder, attacker.side, round);
                }

                const { damage } = resolveAttack(attacker, target.armorClass, random);
                target.currentHP = Math.max(0, target.currentHP - damage);

                // End on the winning attack, even if it happens in the last round.
                if (target.currentHP === 0 && !turnOrder.some(
                    (combatant) => combatant.side === target.side && combatant.currentHP > 0
                )) {
                    return summarizeBattle(turnOrder, attacker.side, round);
                }
            }
        }
    }

    // Both sides still have someone standing, so the trial is unresolved.
    return summarizeBattle(turnOrder, null, roundLimit);
}