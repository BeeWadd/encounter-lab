import { expect, test, vi } from "vitest";
import { simulateBattle } from "./battle";
import type { CombatantInput, EncounterInput } from "./types";

const first: CombatantInput = {
    id: "first",
    name: "First",
    side: "a",
    startingHP: 10,
    armorClass: 12,
    initiativeModifier: 2,
    attackBonus: 3,
    damageDice: "1d6",
    damageModifier: 1,
    attacksPerTurn: 1,
};

const opponent: CombatantInput = {
    ...first,
    id: "opponent",
    name: "Opponent",
    side: "b",
    startingHP: 5,
    initiativeModifier: 0,
};

const encounter: EncounterInput = {
    combatants: [first, opponent],
    sideATargeting: "random",
    sideBTargeting: "random",
};

test("a knockout on the last allowed round still counts as a win", () => {
    // Side A goes first. Its attack hits and deals exactly 5 damage.
    expect(simulateBattle(encounter, 1, () => 0.5)).toEqual({
        winner: "a",
        rounds: 1,
        remainingHP: { a: 10, b: 0},
        knockouts: { a: 0, b: 1 },
    });
    expect(opponent.startingHP).toBe(5);
});

test("a second attack can target another opponent after a knockout", () => {
    // Both opponents have 5 HP, so each hit removes a different target.
    const twoAttacks = { ...first, attacksPerTurn: 2 };
    const otherOpponent = { ...opponent, id: "other" };

    const result = simulateBattle({
        ...encounter,
        combatants: [twoAttacks, opponent, otherOpponent],
    }, 1, () => 0.5);

    expect(result.winner).toBe("a");
    expect(result.knockouts.b).toBe(2);
});

test("a battle with no winner stops at the round limit", () => {
    // Every attack rolls a natural 1. After two rounds, both sides remain.
    const random = vi.fn(() => 0);
    const result = simulateBattle(encounter, 2, random);

    expect(result.winner).toBeNull();
    expect(result.rounds).toBe(2);
    expect(result.remainingHP).toEqual({ a: 10, b: 5});
    // Four draws for initiative and tie-breakers, then four attacks.
    expect(random).toHaveBeenCalledTimes(8);
});