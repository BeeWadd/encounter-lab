import type { BattleCombatant } from "./initiative";
import type { RandomSource } from "./random";
import type { Side, TargetingPolicy } from "./types";

export function selectTarget(
    combatants: readonly BattleCombatant[],
    attackerSide: Side,
    policy: TargetingPolicy,
    random: RandomSource
): BattleCombatant | undefined {
    // Allies and opponents with zero HP are ineligible.
    const opponents = combatants.filter(
        (combatant) =>
            combatant.side !== attackerSide && combatant.currentHP > 0
    );

    // The battle loop can use undefined to tell when no opponent remains.
    if (opponents.length === 0) {
        return undefined;
    }

    let candidates = opponents;

    if(policy === "lowest_hp") {
        // Keep every opponent tied to lowest current HP so we can
        // break ties using the same seeded random source as the battle.
        const lowestHP = Math.min(...opponents.map((opponent) => opponent.currentHP));
        candidates = opponents.filter((opponent) => opponent.currentHP === lowestHP);
    }

    // With one candidate there is no choice, so skip the random draw.
    if (candidates.length === 1) {
        return candidates[0];
    }

    // Array indexes start at zero. With two candidates, 0.75 selects index 1.
    const index = Math.floor(random() * candidates.length);
    return candidates[index];
}