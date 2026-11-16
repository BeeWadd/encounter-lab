import { randomUUID } from "node:crypto";
import { simulateBatch } from "@/lib/combat/batch";
import type { CombatantInput, EncounterInput } from "@/lib/combat/types";
import { createSupabaseClient } from "@/lib/supabase";

const PRACTICE_ENCOUNTER_ID = "2fc5cb48-755c-4d33-a4a9-4e5b52053d72";

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

export async function POST() {
    const trialCount = 100;
    const roundLimit = 20;
    const seed = randomUUID();
    const summary = simulateBatch(encounter, trialCount, roundLimit, seed);
    const supabase = createSupabaseClient();

    // Save the exact inputs and results together so this run can be reopened.
    const { data: savedRun, error } = await supabase
        .from("simulation_runs")
        .insert({
            encounter_id: PRACTICE_ENCOUNTER_ID,
            seed,
            rules_version: "SRD 5.1",
            engine_version: "0.1.0",
            trial_count: trialCount,
            round_limit: roundLimit,
            input_snapshot: encounter,
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
