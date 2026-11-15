import { randomUUID } from "node:crypto";
import { simulateBatch } from "@/lib/combat/batch";
import type { CombatantInput, EncounterInput } from "@/lib/combat/types";

const adventurer: CombatantInput = {
    id: "demo-a",
    name: "Adventurer",
    side: "a",
    startingHP: 12,
    armorClass: 13,
    initiativeModifier: 1,
    attackBonus: 3,
    damageDice: "1d6",
    damageModifier: 2,
    attacksPerTurn: 1,
};

const encounter: EncounterInput = {
    combatants: [
        adventurer,
        {
            ...adventurer,
            id: "demo-b",
            name: "Practice Opponent",
            side: "b",
            startingHP: 10,
            armorClass: 12,
            damageModifier: 1,
        },
    ],
    sideATargeting: "random",
    sideBTargeting: "random",
};

export function POST() {
    const trialCount = 100;
    const roundLimit = 20;
    const seed = randomUUID();
    const summary = simulateBatch(encounter, trialCount, roundLimit, seed);

    return Response.json({ trialCount, roundLimit, ...summary });
}