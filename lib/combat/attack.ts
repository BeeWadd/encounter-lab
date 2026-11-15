import { rollDie } from "./dice";
import { rollDamage } from "./damage";
import type { RandomSource } from "./random";
import type { CombatantInput } from "./types";

// A single attack uses only these three fields from the attacker.
type AttackStats = Pick<
    CombatantInput,
    "attackBonus" | "damageDice" | "damageModifier"
>;

export interface AttackResult {
    outcome: "miss" | "hit" | "critical";
    damage: number
}

export function resolveAttack(
    attacker: AttackStats,
    targetArmorClass: number,
    random: RandomSource
): AttackResult {
    // A natural roll is the number on the die before adding the bonus.
    const naturalRoll = rollDie(20, random);
    const criticalHit = naturalRoll === 20;
    const attackTotal = naturalRoll + attacker.attackBonus;

    // A natural 1 always misses. A natural 20 always hits.
    // Other rolls need a total that meets or exceeds the target's AC.
    if (naturalRoll ===1 || (!criticalHit && attackTotal < targetArmorClass)) {
        return { outcome: "miss", damage: 0};
    }

    // Use the same random source so a seed can reproduce both the
    // attack rolls and the damage rolls that follow it.
    const damage = rollDamage(
        attacker.damageDice,
        attacker.damageModifier,
        random,
        criticalHit
    );

    return { outcome: criticalHit ? "critical" : "hit", damage };
}
