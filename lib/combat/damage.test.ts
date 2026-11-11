import { expect, test, vi } from "vitest";
import { rollDamage } from "./damage";

test("adds two independent die rolls and the flat damage modifier", () => {
    // On a d6, source values of 0 and 0.5 produce rolls of 1 and 4.
    const random = vi.fn(() => 0.5).mockReturnValueOnce(0);

    expect(rollDamage("2d6", 3, random)).toBe(8);
    expect(random).toHaveBeenCalledTimes(2);
});

test("a critical hit doubles the dice and adds the modifier once", () => {
    // Each d6 rolls 4, so four rolls plus 3 give 19.
    const random = vi.fn(() => 0.5);

    expect(rollDamage("2d6", 3, random, true)).toBe(19);
    expect(random).toHaveBeenCalledTimes(4);
});

test("a negative damage modifier can reduce damage to zero", () => {
    // A roll of 1 with a -3 modifier should deal zero damage.
    expect(rollDamage("1d6", -3, () => 0)).toBe(0);
});

test("rejects malformed or oversized dice expressions", () => {
    // The modifier belongs in its own field and the dice count is capped.
    expect(() => rollDamage("2d6+3", 0, () => 0)).toThrow();
    expect(() => rollDamage("101d6", 0, () => 0)).toThrow();
});