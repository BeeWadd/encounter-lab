import { expect, test } from "vitest";
import { rollDie } from "./dice";
import { createSeededRandom } from "./random";

test("the lowest random value produces a roll of 1", () => {
    // Supply the lowest allowed random value to verify the die's lower bound.
    expect(rollDie(10, () => 0)).toBe(1);
});

test("a random value near 1 produces the highest roll", () => {
    // A source value just below 1 must still produce a valid maximum roll.
    expect(rollDie(20, () => 0.999999)).toBe(20);
});

test("the same seed reproduces a sequence of dice rolls", () => {
    // Independent generators with the same seed should produce matching rolls
    // at every position, which is required for reproducing a saved simulation.
    const firstRandom = createSeededRandom("practice-encounter");
    const secondRandom = createSeededRandom("practice-encounter");

    const firstRolls = Array.from(
        { length: 20 },
        () => rollDie(20, firstRandom)
    );

    const secondRolls = Array.from(
        { length: 20 },
        () => rollDie(20, secondRandom)
    );

    expect(firstRolls).toEqual(secondRolls);
});

test("invalid die sizes are rejected", () => {
    // Invalid inputs must fail explicitly instead of producing misleading rolls.
    expect(() => rollDie(0, () => 0.5)).toThrow();
    expect(() => rollDie(2.5, () => 0.5)).toThrow();
});
