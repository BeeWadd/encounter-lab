import { expect, test, vi } from "vitest";
import { simulateBatch } from "./batch";
import type { CombatantInput, EncounterInput } from "./types";
import * as battle from "./battle";

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
        metricScope: "completed_trials",
        knockoutPercent: null,
        averageRemainingHP: null,
    });
});

test("completed-trial metrics count knockout events and exclude capped trials", () => {
    // These summaries represent multi-combatant battles.
    const battleMock = vi.spyOn(battle, "simulateBattle").mockReturnValueOnce({
        winner: "a",
        rounds: 2,
        remainingHP: { a: 9, b: 0 },
        knockouts: { a: 0, b: 2 },
    }).mockReturnValueOnce({
        winner: null,
        rounds: 20,
        remainingHP: { a: 100, b: 100},
        knockouts: { a: 1, b: 1},
    }).mockReturnValueOnce({
        winner: "b",
        rounds: 4,
        remainingHP: { a: 0, b: 6 },
        knockouts: { a: 3, b: 0 },
    });

    try {
        const result = simulateBatch(encounter, 3, 20, "known-metrics");

        // Each side suffers a knockout in one of the two completed trials.
        expect(result.knockoutPercent).toEqual({ a: 50, b: 50 });

        // Include a defeated side's zero HP in its average.
        expect(result.averageRemainingHP).toEqual({ a: 4.5, b: 3 });
        expect(result.averageCompletedRounds).toBe(3);
        expect(result.unresolvedTrials).toBe(1);
    } finally {
        battleMock.mockRestore();
    }
});