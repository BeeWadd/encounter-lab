import { expect, test, vi } from "vitest";
import { prepareTurnOrder } from "./initiative";
import type { CombatantInput } from "./types";

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

const second: CombatantInput = {
    ...first,
    id: "second",
    name: "Second",
    side: "b",
};

test("higher initiative goes first and each combatant starts at full HP", () => {
    //Both roll 11. The second combatant's +2 puts it first.
    const faster = {...second, initiativeModifier: 2 };
    const order = prepareTurnOrder([first, faster], () => 0.5);

    expect(order.map((combatant) => combatant.id)).toEqual(["second", "first"]);
    expect(order[0].currentHP).toBe(faster.startingHP);
    expect(order[0]).not.toBe(faster);
});

test("a pre-rolled tie-breaker decides equal initiative", () => {
    // Each combatant rolls 11. The second has the higher tie-breaker.
    const random = vi.fn().mockReturnValueOnce(0.5).mockReturnValueOnce(0.2).mockReturnValueOnce(0.5).mockReturnValueOnce(0.8);
    
    const order = prepareTurnOrder([first, second], random);

    expect(order.map((combatant) => combatant.id)).toEqual(["second", "first"]);
    expect(random).toHaveBeenCalledTimes(4);
});