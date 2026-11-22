import { randomUUID } from "node:crypto";
import { simulateBatch } from "@/lib/combat/batch";
import type { CombatantInput, EncounterInput, TargetingPolicy } from "@/lib/combat/types";
import { createSupabaseClient } from "@/lib/supabase";
import { rollDamage } from "@/lib/combat/damage";

const PRACTICE_ENCOUNTER_ID = "2fc5cb48-755c-4d33-a4a9-4e5b52053d72";
const MAX_COMBATANTS = 12;

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

function isStartingHP(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) &&
        value >= 1 && value <= 999;
}

function isArmorClass(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value >=1;
}

function isAttackBonus(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value <= 20 && value >= -20;
}

function isDamageDice(value: unknown): value is string {
    if (typeof value !== "string") {
        return false;
    }

    try {
        // Reuse the engine's dice rules without consuming the simulation's seed.
        rollDamage(value, 0, () => 0);
        return true;
    } catch {
        return false;
    }
}

function isDamageModifier(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value <= 20 && value >= -20;
}

function isInitiativeModifier(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value <= 20 && value >= -20;
}

function isAttacksPerTurn(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value <= 10 && value >= 1;
}

function isTargetingPolicy(value: unknown): value is TargetingPolicy {
    return value === "random" || value === "lowest_hp";
}

function isCombatantInput(value: unknown): value is CombatantInput {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    // Each property remains unknown until its individual check succeeds.
    const combatant = value as Record<string, unknown>;

    return (
        typeof combatant.id === "string" &&
        combatant.id.trim().length > 0 && combatant.id.length <= 80 &&
        typeof combatant.name === "string" &&
        combatant.name.trim().length > 0 && combatant.name.length <= 80 &&
        (combatant.side === "a" || combatant.side === "b") &&
        isStartingHP(combatant.startingHP) &&
        isArmorClass(combatant.armorClass) &&
        isInitiativeModifier(combatant.initiativeModifier) &&
        isAttackBonus(combatant.attackBonus) &&
        isDamageDice(combatant.damageDice) &&
        isDamageModifier(combatant.damageModifier) &&
        isAttacksPerTurn(combatant.attacksPerTurn)
    );
}

function parseEncounterInput(input: object): EncounterInput {
    if (
        !("combatants" in input) ||
        !Array.isArray(input.combatants) ||
        input.combatants.length < 2 ||
        input.combatants.length > MAX_COMBATANTS
    ) {
        throw new Error("Use 2-12 combatants in total.");
    }

    if (
        !("sideATargeting" in input) || !isTargetingPolicy(input.sideATargeting) ||
        !("sideBTargeting" in input) || !isTargetingPolicy(input.sideBTargeting)
    ) {
        throw new Error("Choose random or lowest-HP targeting for each side.");
    }

    const combatants = input.combatants.map((value, index): CombatantInput => {
        if (!isCombatantInput(value)) {
            throw new Error('Combatant ${index + 1} has an invalid ID, name, side or combat stat.');
        }

        // Build a clean snapshot containing the fields the engine uses.
        return {
            id: value.id.trim(),
            name: value.name.trim(),
            side: value.side,
            startingHP: value.startingHP,
            armorClass: value.armorClass,
            initiativeModifier: value.initiativeModifier,
            attackBonus: value.attackBonus,
            damageDice: value.damageDice.trim().toLowerCase(),
            damageModifier: value.damageModifier,
            attacksPerTurn: value.attacksPerTurn,
        };
    });

    if (new Set(combatants.map((combatant) => combatant.id)).size !== combatants.length) {
        throw new Error("Each combatant needs a unique ID.");
    }

    if (
        !combatants.some((combatant) => combatant.side === "a") ||
        !combatants.some((combatant) => combatant.side === "b")
    ) {
        throw new Error("Add at least one combatant to each side.");
    }

    return {
        combatants,
        sideATargeting: input.sideATargeting,
        sideBTargeting: input.sideBTargeting,
    };
}

export async function POST(request: Request) {
    let runEncounter = encounter;

    // A bodyless request still runs the original practce preset.
    if (request.body !== null) {
        const input: unknown = await request.json().catch(() => null);

        if (input === null || typeof input !== "object" || Array.isArray(input)) {
            return Response.json({ error: "Send an encounter object."}, { status: 400 });
        }

        if ("combatants" in input) {
            try {
                runEncounter = parseEncounterInput(input);
            } catch (error) {
                return Response.json({ error: error instanceof Error ? error.message : "Invalid encounter." }, { status: 400 });
            }
        } else {

            if (
                !("sideAHp" in input) || !("sideBHp" in input) ||
                !isStartingHP(input.sideAHp) || !isStartingHP(input.sideBHp)
            ) {
                return Response.json(
                    { error: "Starting HP must be a whole number from 1 to 999 for both sides." }, { status: 400 },
                );
            }

            const { sideAHp, sideBHp } = input;
            // HP-only requests can still use the preset Armor Class values.
            const sideAArmorClass = "sideAArmorClass" in input ? input.sideAArmorClass : undefined;
            const sideBArmorClass = "sideBArmorClass" in input ? input.sideBArmorClass : undefined;

            if (
                (sideAArmorClass !== undefined && !isArmorClass(sideAArmorClass)) ||
                (sideBArmorClass !== undefined && !isArmorClass(sideBArmorClass))
            ) {
                return Response.json(
                    { error: "Armor Class must be a positive whole number." }, { status: 400 }
                );
            }

            const sideAAttackBonus = "sideAAttackBonus" in input ? input.sideAAttackBonus : undefined;
            const sideBAttackBonus = "sideBAttackBonus" in input ? input.sideBAttackBonus : undefined;

            // Requests can omit these fields and use the preset bonuses.
            if (
                (sideAAttackBonus !== undefined && !isAttackBonus(sideAAttackBonus)) ||
                (sideBAttackBonus !== undefined && !isAttackBonus(sideBAttackBonus))
            ) {
                return Response.json(
                    { error: "Attack bonus must be a whole number from -20 to 20."}, { status: 400 },
                );
            }

            const sideADamageDice = "sideADamageDice" in input ? input.sideADamageDice : undefined;
            const sideBDamageDice = "sideBDamageDice" in input ? input.sideBDamageDice : undefined;
            const sideADamageModifier = "sideADamageModifier"in input ? input.sideADamageModifier : undefined;
            const sideBDamageModifier = "sideBDamageModifier"in input ? input.sideBDamageModifier : undefined;

            // Requests can omit these fields and use the preset values.
            if (
                (sideADamageDice !== undefined && !isDamageDice(sideADamageDice)) ||
                (sideBDamageDice !== undefined && !isDamageDice(sideBDamageDice))
            ) {
                return Response.json(
                    { error: "Use damage dice such as 1d6 or 2d8, with 1-100 dice and 2-100 sides per die."}, { status: 400 },
                );
            }

            if (
                (sideADamageModifier !== undefined && !isDamageModifier(sideADamageModifier)) ||
                (sideBDamageModifier !== undefined && !isDamageModifier(sideBDamageModifier))
            ) {
                return Response.json(
                    { error: "Damage Modifier must be a whole number between -20 and 20."}, { status: 400 },
                );
            }

            const sideAInitiativeModifier = "sideAInitiativeModifier" in input ? input.sideAInitiativeModifier : undefined;
            const sideBInitiativeModifier = "sideBInitiativeModifier" in input ? input.sideBInitiativeModifier : undefined;

            // Requests can omit these fields and use the preset values.
            if (
                (sideAInitiativeModifier !== undefined && !isInitiativeModifier(sideAInitiativeModifier)) ||
                (sideBInitiativeModifier !== undefined && !isInitiativeModifier(sideBInitiativeModifier))
            ) {
                return Response.json(
                    { error: "Initiative Modifier must be a whole number from -20 to 20."}, { status: 400 },
                );
            }

            const sideAAttacksPerTurn = "sideAAttacksPerTurn" in input ? input.sideAAttacksPerTurn : undefined;
            const sideBAttacksPerTurn = "sideBAttacksPerTurn" in input ? input.sideBAttacksPerTurn : undefined;

            // Requests can omit these fields and use the preset values.
            if (
                (sideAAttacksPerTurn !== undefined && !isAttacksPerTurn(sideAAttacksPerTurn)) ||
                (sideBAttacksPerTurn !== undefined && !isAttacksPerTurn(sideBAttacksPerTurn))
            ) {
                return Response.json(
                    { error: "Attacks Per Turn must be a whole number from 1 to 10."}, { status: 400 },
                );
            }

            const sideATargeting = "sideATargeting" in input ? input.sideATargeting : undefined;
            const sideBTargeting = "sideBTargeting" in input ? input.sideBTargeting : undefined;

            // Requests can omit these fields and use the preset values.
            if (
                (sideATargeting !== undefined && !isTargetingPolicy(sideATargeting)) ||
                (sideBTargeting !== undefined && !isTargetingPolicy(sideBTargeting))
            ) {
                return Response.json(
                    { error: "Choose random or lowest-HP targeting for each side."}, { status: 400 },
                );
            }

            // Copy the preset so each run has its own starting stats.
            runEncounter = {
                ...encounter,
                sideATargeting: sideATargeting ?? encounter.sideATargeting,
                sideBTargeting: sideBTargeting ?? encounter.sideBTargeting,
                combatants: encounter.combatants.map((combatant) => ({
                    ...combatant,
                    startingHP: combatant.side === "a" ? sideAHp : sideBHp,
                    armorClass: (combatant.side === "a" ? sideAArmorClass : sideBArmorClass) ?? combatant.armorClass,
                    attackBonus: (combatant.side === "a" ? sideAAttackBonus : sideBAttackBonus) ?? combatant.attackBonus,
                    damageDice: (combatant.side === "a" ? sideADamageDice : sideBDamageDice)?.trim().toLowerCase() ?? combatant.damageDice,
                    damageModifier: (combatant.side === "a" ? sideADamageModifier : sideBDamageModifier) ?? combatant.damageModifier,
                    initiativeModifier: (combatant.side === "a" ? sideAInitiativeModifier : sideBInitiativeModifier) ?? combatant.initiativeModifier,
                    attacksPerTurn: (combatant.side === "a" ? sideAAttacksPerTurn : sideBAttacksPerTurn) ?? combatant.attacksPerTurn,
                })),
            };
        }
    }
    
    const trialCount = 100;
    const roundLimit = 20;
    const seed = randomUUID();
    const summary = simulateBatch(runEncounter, trialCount, roundLimit, seed);
    const supabase = createSupabaseClient();

    // Save the exact inputs and results together so this run can be reopened.
    const { data: savedRun, error } = await supabase
        .from("simulation_runs")
        .insert({
            encounter_id: PRACTICE_ENCOUNTER_ID,
            seed,
            rules_version: "SRD 5.1",
            engine_version: "0.2.0",
            trial_count: trialCount,
            round_limit: roundLimit,
            input_snapshot: runEncounter,
            result_summary: summary,
        })
        .select("id")
        .single();
    
    if (error || !savedRun) {
        console.error("Could not save practice run:", error?.message);
        return Response.json({ error: "Could not save the run." }, { status: 500 });
    }

    // Return the database ID only after Supabase confirms the save.
    return Response.json({ runId: savedRun.id, trialCount, roundLimit, ...summary });
}

export async function GET(request: Request) {
    const runId = new URL(request.url).searchParams.get("runId");

    // Check that the ID looks like a UUID before querying Supabase.
    if (!runId || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(runId)) {
        return Response.json({ error: "Enter a valid run ID." }, { status: 400 });
    }

    // Only load runs that belong to the practice encounter.
    const { data: savedRun, error } = await createSupabaseClient()
        .from("simulation_runs")
        .select("id, trial_count, round_limit, result_summary")
        .eq("encounter_id", PRACTICE_ENCOUNTER_ID)
        .eq("id", runId)
        .maybeSingle();
    
    if (error) {
        console.error("Could not load practice run:", error.message);
        return Response.json({ error: "Could not load the run." }, { status: 500 });
    }

    if (!savedRun) {
        return Response.json({ error: "Saved run not found." }, { status: 404 });
    }

    // Return the same shape as POST so the homepage can reuse its results list.
    return Response.json({
        ...savedRun.result_summary,
        runId: savedRun.id,
        trialCount: savedRun.trial_count,
        roundLimit: savedRun.round_limit,
    });
}
