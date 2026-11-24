"use client";

import { useState } from "react";
import type { simulateBatch } from "@/lib/combat/batch";
import CombatantEditor, {
    type CombatantDraft, 
    type EditableCombatantField,
} from "./combatant-editor";
import type { CombatantInput, EncounterInput, Side } from "@/lib/combat/types";

type BatchSummary = ReturnType<typeof simulateBatch>;

type DemoRun = Omit<BatchSummary, "metricScope" | "knockoutPercent" | "averageRemainingHP"> & {
    // Older saved summaries do not contain these fields.
    metricScope?: BatchSummary["metricScope"];
    knockoutPercent?: BatchSummary["knockoutPercent"];
    averageRemainingHP?: BatchSummary["averageRemainingHP"];
    trialCount: number;
    roundLimit: number;
    runId: string;
    inputSnapshot?: EncounterInput;
};

const MAX_COMBATANTS = 12;

function createCombatant(side: Side, id: string): CombatantDraft {
    return {
        id,
        side,
        name: side === "a" ? "Adventurer" : "Practice Opponent",
        startingHP: side === "a" ? "12" : "10",
        armorClass: side === "a" ? "13" : "12",
        initiativeModifier: "1",
        attackBonus: "3",
        damageDice: "1d6",
        damageModifier: side === "a" ? "2" : "1",
        attacksPerTurn: "1",
    };
}

function numberFromInput(value: string): number | null {
    return value.trim() === "" ? null : Number(value);
}

function toCombatantDraft(combatant: CombatantInput): CombatantDraft {
    // Create an editable copy with text values for the numeric input fields.
    return {
        ...combatant,
        startingHP: String(combatant.startingHP),
        armorClass: String(combatant.armorClass),
        initiativeModifier: String(combatant.initiativeModifier),
        attackBonus: String(combatant.attackBonus),
        damageModifier: String(combatant.damageModifier),
        attacksPerTurn: String(combatant.attacksPerTurn),
    };
}

export default function SimulationDemo() {
    const [result, setResult] = useState<DemoRun | null>(null);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");
    const [runIdToLoad, setRunIdToLoad] = useState("");
    const [combatants, setCombatants] = useState<CombatantDraft[]>(() => [
        createCombatant("a", "demo-a"),
        createCombatant("b", "demo-b"),
    ]);
    const [sideATargeting, setSideATargeting] = useState("random");
    const [sideBTargeting, setSideBTargeting] = useState("random");

    async function requestRun(url: string, options: RequestInit) {
        setRunning(true);
        setError("");
        setResult(null);

        try {
            // Both actions display the same summary when the server responds.
            const response = await fetch(url, options);
            if (!response.ok) {
                const problem = await response.json();
                setError(problem.error ?? "The request failed.");
                return;
            }

            const summary: DemoRun = await response.json();
            
            if (summary.inputSnapshot) {
                const restoredCombatants = summary.inputSnapshot.combatants.map(toCombatantDraft);
                setCombatants(restoredCombatants);
                setSideATargeting(summary.inputSnapshot.sideATargeting);
                setSideBTargeting(summary.inputSnapshot.sideBTargeting);
            }

            setResult(summary);
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setRunning(false);
        }
    }

    function updateCombatant(id: string, field: EditableCombatantField, value: string) {
        setCombatants((current) => current.map((combatant) =>
            combatant.id === id ? { ...combatant, [field]: value } : combatant
        ));
    }

    function addCombatant(side: Side) {
        // Generate IDs only in response to a user action.
        const added = createCombatant(side, crypto.randomUUID());
        setCombatants((current) =>
            current.length >= MAX_COMBATANTS ? current : [...current, added]
        );
        setResult(null);
    }

    function removeCombatant(id: string) {
        setCombatants((current) => {
            const remaining = current.filter((combatant) => combatant.id !== id);
            
            // Preserve at least one participant per side, even for batched updates.
            if (
                !remaining.some((combatant) => combatant.side === "a") ||
                !remaining.some((combatant) => combatant.side === "b")
            ) {
                return current;
            }
            
            return remaining;
        });
        setResult(null);
    }
    
    function runSimulation() {
        return requestRun("/api/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                combatants: combatants.map((combatant) => ({
                    ...combatant,
                    name: combatant.name.trim(),
                    damageDice: combatant.damageDice.trim(),
                    startingHP: numberFromInput(combatant.startingHP),
                    armorClass: numberFromInput(combatant.armorClass),
                    initiativeModifier: numberFromInput(combatant.initiativeModifier),
                    attackBonus: numberFromInput(combatant.attackBonus),
                    damageModifier: numberFromInput(combatant.damageModifier),
                    attacksPerTurn: numberFromInput(combatant.attacksPerTurn),
                })),
                sideATargeting,
                sideBTargeting,
            }),
        });
    }

    return (
        <section className="mt-10">
            <h2 className="mb-3 text-2x1 font-semibold">Encounter simulation</h2>
            <p className="mb-3">
                {combatants.length} of {MAX_COMBATANTS} combatants. At least one per side.
            </p>
            <fieldset disabled={running} onChange={() => setResult(null)}>
                {(["a", "b"] as const).map((side) => {
                    const members = combatants.filter((combatant) => combatant.side === side);

                    return (
                        <section key={side} className="mb-6">
                            <h3 className="mb-3 text-x1 font-semibold">
                                Side {side.toUpperCase()}
                            </h3>
                            {members.map((combatant) => (
                                <CombatantEditor
                                    key={combatant.id}
                                    combatant={combatant}
                                    onChange={(field, value) => updateCombatant(combatant.id, field, value)}
                                    onRemove={() => removeCombatant(combatant.id)}
                                    canRemove={members.length > 1}
                                />
                            ))}
                            <button
                                type="button"
                                className="rounded border px-3 py-1 disabled:opacity-60"
                                disabled={combatants.length >= MAX_COMBATANTS}
                                onClick={() => addCombatant(side)}
                            >
                                Add Combatant
                            </button>
                        </section>
                    );
                })}
                <label>
                    Side A Targeting
                    <select
                        value={sideATargeting}
                        onChange={(event) => setSideATargeting(event.currentTarget.value)}
                    >
                        <option value="random">Random living opponent</option>
                        <option value="lowest_hp">Lowest current HP</option>
                    </select>
                </label>
                <label>
                    Side B Targeting
                    <select
                        value={sideBTargeting}
                        onChange={(event) => setSideBTargeting(event.currentTarget.value)}
                    >
                        <option value="random">Random living opponent</option>
                        <option value="lowest_hp">Lowest current HP</option>
                    </select>
                </label>
            </fieldset>
            <button
                type="button"
                onClick={runSimulation}
                disabled={running}
                className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-60"
            >
                {running ? "Working..." : "Run Simulation"}
            </button>

            <div className="mt-4">
                <label htmlFor="saved-run-id">Saved run ID</label>
                <input
                    id="saved-run-id"
                    className="mx-2 border px-2 py-1"
                    value={runIdToLoad}
                    onChange={(event) => setRunIdToLoad(event.target.value)}
                />
                <button
                    type="button"
                    className="rounded border px-3 py-1 disabled:opacity-60"
                    disabled={running || !runIdToLoad.trim()}
                    onClick={() => {
                        // URLSearchParams encodes the ID value entered by the user.
                        const query = new URLSearchParams({ runId: runIdToLoad.trim() });
                        return requestRun(`/api/simulate?${query}`, { method: "GET" });
                    }}
                >
                    Load Saved Run
                </button>
            </div>

            <div className="mt-3" aria-live="polite">
                {error && <p>{error}</p>}
                {result && (
                    <ul>
                        <li>Saved run ID: {result.runId}</li>
                        <li>Trials: {result.trialCount}</li>
                        <li>Side A wins: {result.winPercent.a.toFixed(1)}%</li>
                        <li>Side B wins: {result.winPercent.b.toFixed(1)}%</li>
                        <li>Unresolved: {result.unresolvedTrials}</li>
                        <li>
                            Average completed rounds:{" "}
                            {result.averageCompletedRounds?.toFixed(1) ?? "None"}
                        </li>
                        <li>Knockout and HP metrics use completed battles only.</li>
                        <li>
                            Side A chance of at least one knockout:{" "}
                            {result.knockoutPercent ? result.knockoutPercent.a.toFixed(1) + "%" : "Unavailable"}
                        </li>
                        <li>
                            Side B chance of at least one knockout:{" "}
                            {result.knockoutPercent ? result.knockoutPercent.b.toFixed(1) + "%" : "Unavailable"}
                        </li>
                        <li>
                            Side A average remaining total HP:{" "}
                            {result.averageRemainingHP?.a.toFixed(1) ?? "Unavailable"}
                        </li>
                        <li>
                            Side B average remaining total HP:{" "}
                            {result.averageRemainingHP?.b.toFixed(1) ?? "Unavailable"}
                        </li>
                        {(result.knockoutPercent == null || result.averageRemainingHP == null) && (
                            <li>
                                These metrics are unavailable for older saved runs or batches with no completed battles.
                            </li>
                        )}
                        
                    </ul>
                )}
            </div>
        </section>
    );
}
