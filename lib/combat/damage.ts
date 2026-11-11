import { rollDie } from "./dice";
import type { RandomSource } from "./random";

export function rollDamage(
    damageDice: string,
    damageModifier: number,
    random: RandomSource,
    criticalHit = false
): number {
    // Match the entire dice expression. The two groups capture the number of dice
    // and the number of sides, respectively.
    const match = /^([1-9]\d*)d([1-9]\d*)$/i.exec(damageDice.trim());

    if (!match) {
        throw new Error('Use dice notation like "2d6".');
    }

    const diceCount = Number(match[1]);
    const sides = Number(match[2]);

    // Cap the work one damage roll can perform on custom inputs.
    if (diceCount > 100 || sides < 2 || sides > 100) {
        throw new Error("Use 1-100 dice with 2-100 sides each.");
    }

    if (!Number.isSafeInteger(damageModifier)) {
        throw new Error("The damage modifier must be an integer.");
    }

    // A critical hit rolls additional dice and applies the flat modifier once.
    const rolls = criticalHit ? diceCount * 2 : diceCount;
    let total = damageModifier;

    for (let i = 0; i < rolls; i++) {
        total += rollDie(sides, random);
    }

    // A negative damage modifier can reduce damage to zero.
    return Math.max(0, total); 
}