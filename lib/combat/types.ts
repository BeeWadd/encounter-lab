// Restrict team assignments to the two sides supported by the simulation.
export type Side = "a" | "b";

// These values match the targeting choices stored in Supabase.
export type TargetingPolicy = "random" | "lowest_hp";

// Starting statistics supplied to the engine. During combat, remaining HP
// will be tracked separately so the original encounter input stays intact.
export interface CombatantInput {
    id: string;
    name: string;
    side: Side;
    startingHP: number;
    armorClass: number;
    initiativeModifier: number;
    attackBonus: number;
    damageDice: string; // Dice expression such as "1d6".
    damageModifier: number; // Flat bonus added after rolling the dice.
    attacksPerTurn: number;
}

// Both sides share one participant list, with each combatant's side field
// identifying its team. Each team has its own targeting policy.
// TypeScript checks this shape during development. Backend runtime validation
// will also check values such as positive starting HP and nonempty teams.
export interface EncounterInput {
    combatants: CombatantInput[];
    sideATargeting: TargetingPolicy;
    sideBTargeting: TargetingPolicy;
}
