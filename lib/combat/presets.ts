import type { CombatantInput } from "./types";

export type CombatantPreset = {
    profileId: string;
    stats: Omit<CombatantInput, "id" | "side">;
};