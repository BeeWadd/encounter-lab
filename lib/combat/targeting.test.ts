import { expect, test } from "vitest";
import type { BattleCombatant } from "./initiative";
import { selectTarget} from "./targeting";

const ally: BattleCombatant = {
    id: "ally",
    name: "Ally",
    side: "a",
    startingHP: 10,
    currentHP: 1,
    armorClass: 12,
    initiativeModifier: 0,
    attackBonus: 3,
    damageDice: "1d6",
    damageModifier: 1,
    attacksPerTurn: 1,
};

const healthy: BattleCombatant = {
    ...ally,
    id: "healthy",
    name: "Healthy opponent",
    side: "b",
    currentHP: 8,
};

const wounded: BattleCombatant = {
    ...healthy,
    id: "wounded",
    currentHP: 3,
};

const knockedOut: BattleCombatant = {
    ...healthy,
    id: "knocked-out",
    currentHP: 0,
};

test("random targeting chooses only among living opponents", () => {
    // After filtering, index 1 is the wounded opponent.
    const order = [ally, healthy, knockedOut, wounded];
    expect(selectTarget(order, "a", "random", () => 0.75)).toBe(wounded);
});

test("lowest-HP targeting uses current HP among living opponents", () => {
    // The ally and knocked-out opponents both  have less HP but are ineligible.
    const order = [ally, healthy, knockedOut, wounded];
    expect(selectTarget(order, "a", "lowest_hp", () => 0)).toBe(wounded);
});

test("lowest-hp targeting breaks a tie with the supplied random source", () => {
    // Both opponents have 3 HP, so the random draw picks the second.
    const tied = { ...healthy, currentHP: 3 };
    expect(selectTarget([tied, wounded], "a", "lowest_hp", () => 0.75)).toBe(wounded);
});

test("returns undefines when no living opponent remains", () => {
    // The battle loop can recognize this as the end of combat.
    expect(selectTarget([ally, knockedOut], "a", "random", () => 0)).toBeUndefined();
});