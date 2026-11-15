import { rollDie } from "./dice";
import type { RandomSource } from "./random";
import type { CombatantInput } from "./types";

export type BattleCombatant = CombatantInput & {
    currentHP: number;
};

export function prepareTurnOrder(
    combatants: readonly CombatantInput[],
    random: RandomSource
): BattleCombatant[] {
    const entries = combatants.map((combatant) => ({
        // Copy each participant so damage can change currentHP
        // without changing the starting stats used for the next trial.
        combatant: { ...combatant, currentHP: combatant.startingHP },
        initiative: rollDie(20, random) + combatant.initiativeModifier,
        // Draw once once before sorting so a tied pair is compared consistently.
        tieBreaker: random(),
    }));

    // Highest initiative goes first. Use the seeded tie-breaker on ties.
    entries.sort((a, b) =>
        b.initiative - a.initiative || b.tieBreaker - a.tieBreaker
    );

    return entries.map((entry) => entry.combatant);
}