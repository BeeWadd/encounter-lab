import type { RandomSource } from "./random";

// Roll one die using the supplied source. Passing the source in lets us use
// seeded randomness in simulations and fixed values in rule tests.
export function rollDie(
    sides: number,
    random: RandomSource
): number {
    // Reject fractional, non-finite, or unsupported die sizes before rolling.
    if (!Number.isSafeInteger(sides) || sides < 2) {
        throw new Error("A die must have an integer number of sides of at least 2.");
    }

    // For a d20, scaling [0, 1) gives [0, 20). Rounding down gives 0-19,
    // then adding 1 produces a valid die result from 1 through 20.
    return Math.floor(random() * sides) + 1;
}
