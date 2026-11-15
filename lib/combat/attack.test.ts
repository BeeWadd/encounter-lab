import  { expect, test, vi } from "vitest";
import { resolveAttack } from "./attack";

const attacker = {
    attackBonus: 3,
    damageDice: "1d6",
    damageModifier: 2,
};

test("an attack hits when its total equals the target's AC", () => {
    // 0.5 gives 11 on a d20 and 4 on a d6.
    // The attack total is 11 + 3 = 14, and damage is 4 + 2 = 6.
    expect(resolveAttack(attacker, 14, () => 0.5)).toEqual({
        outcome: "hit",
        damage: 6,
    });
});

test("an attack below the target's AC misses without rolling damage", () => {
    //The total is still 14. AC 15 stops the attack after one roll.
    const random = vi.fn(() => 0.5);

    expect(resolveAttack(attacker, 15, random)).toEqual({
        outcome: "miss",
        damage: 0,
    });
    expect(random).toHaveBeenCalledTimes(1);
});

test("a natural 1 misses even when the total meets the target's AC", () => {
    // a roll of 1 plus the bonus gives 4, but the natural 1 rule applies.
    expect(resolveAttack(attacker, 4, () => 0)).toEqual({
        outcome: "miss",
        damage: 0,
    });
});

test("a natural 20 is a critical hit regardless of the target's AC", () => {
    // Use 0.999999 for the d20, then 0.5 for each damage die.
    // The critical hit deals 4 + 4 + 2 = 10 damage.
    const random = vi.fn(() => 0.5).mockReturnValueOnce(0.999999);

    expect(resolveAttack(attacker, 100, random)).toEqual({
        outcome: "critical",
        damage: 10,
    });
});