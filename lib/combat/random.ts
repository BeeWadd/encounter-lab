import seedrandom from "seedrandom";

// Combat functions accept a random-number source so tests can control rolls.
// Sources must return a value greater than or equal to 0 and less than 1.
export type RandomSource = () => number;

// The same seed starts the same sequence. Create one generator for a run and
// reuse it for successive rolls, rather than resetting it before each roll.
// Reproducing a full run also requires the same inputs and engine version.
export function createSeededRandom(seed: string): RandomSource {
    return seedrandom(seed);
}
