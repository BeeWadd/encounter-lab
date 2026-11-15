import { expect, test } from "vitest";
import { simulateBatch } from "./batch";
import type { CombatantInput, EncounterInput } from "./types";

const first: CombatantInput = {
    id: "first",
    name: "First",
    side: "a",
    startingHP: 10,
    armorClass: 12,
    initiativeModifier: 0,
    attackBonus: 3,
    damageDice: "1d6",
    damageModifier: 1,
    attacksPerTurn: 1,
};

const encounter: EncounterInput = {
    combatants: [
        first,
        { ...first, id: "second", name: "Second", side: "b" },
    ],
    sideATargeting: "random",
    sideBTargeting: "random",
};

test("the same seed and settings reproduce the batch summary", () => {
    // Every trial should land in exactly one bucket.
    const result = simulateBatch(encounter, 20, 10, "practice-batch");

    expect(result).toEqual(simulateBatch(encounter, 20, 10, "practice-batch"));
    expect(result.wins.a + result.wins.b + result.unresolvedTrials).toBe(20);
});

test("an entirely unresolved batch has no average completed duration", () => {
    // Even a critical hit rolls at most 12 on 2d6, so -12 prevents damage.
    const noDamage: EncounterInput = {
        ...encounter,
        combatants: encounter.combatants.map((combatant) => ({
            ...combatant,
            damageModifier: -12,
        })),
    };

    expect(simulateBatch(noDamage, 3, 2, "no-damage")).toEqual({
        wins: { a: 0, b: 0 },
        unresolvedTrials: 3,
        winPercent: { a: 0, b: 0 },
        averageCompletedRounds: null,
    });
});