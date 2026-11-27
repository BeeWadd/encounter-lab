"use client";

import { useEffect, useState } from "react";
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

type SavedRunOption = {
    id: string;
    createdAt: string;
    trialCount: number;
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

type ComparisonMetric = {
    label: string;
    value: (run: DemoRun) => number | null | undefined;
    unit: "%" | " rounds" | " HP";
};

const COMPARISON_METRICS: ComparisonMetric[] = [
    { label: "Side A win chance", value: (run) => run.winPercent.a, unit: "%" },
    { label: "Side B win chance", value: (run) => run.winPercent.b, unit: "%" },
    { label: "Average completed rounds", value: (run) => run.averageCompletedRounds, unit: " rounds" },
    { label: "Side A suffers at least one knockout", value: (run) => run.knockoutPercent?.a, unit: "%" },
    { label: "Side B suffers at least one knockout", value: (run) => run.knockoutPercent?.b, unit: "%" },
    { label: "Side A average remaining total HP", value: (run) => run.averageRemainingHP?.a, unit: " HP" },
    { label: "Side B average remaining total HP", value: (run) => run.averageRemainingHP?.b, unit: " HP" },
];

function formatMetric(
    value: number | null | undefined,
    unit: ComparisonMetric["unit"],
): string {
    return value == null ? "Unavailable" : value.toFixed(1) + unit;
}

function formatDifference(
    baseline: number | null | undefined,
    comparison: number | null | undefined,
    unit: ComparisonMetric["unit"],
): string {
    // Missing values must not be treated as zero
    if (baseline == null || comparison == null) return "Unavailable";

    // Round before choosing the sign to avoid displaying negative zero.
    const difference = Number((comparison - baseline).toFixed(1));
    const sign = difference > 0 ? "+" : "";
    const differenceUnit = unit === "%" ? " pp" : unit;

    return sign + difference.toFixed(1) + differenceUnit;
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
    const [savedRuns, setSavedRuns] = useState<SavedRunOption[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState("");
    const [historyVersion, setHistoryVersion] = useState(0);
    const [baselineRun, setBaselineRun] = useState<DemoRun | null>(null);
    const [comparisonRun, setComparisonRun] = useState<DemoRun | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        async function loadHistory() {
            try {
                const response = await fetch("/api/simulate", {
                    signal: controller.signal,
                    cache: "no-store"
                });

                if (!response.ok) {
                    throw new Error("History request failed.");
                }

                const history: { runs: SavedRunOption[] } = await response.json();
                if (!Array.isArray(history.runs)) {
                    throw new Error("Invalid history response.");
                }

                if (!controller.signal.aborted) {
                    setSavedRuns(history.runs);
                }
            } catch {
                if (!controller.signal.aborted) {
                    setHistoryError("Could not load saved runs. Try Refresh runs.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setHistoryLoading(false);
                }
            }
        }

        void loadHistory();

        // An older request must not overwrite a refereshed list.
        return () => controller.abort();
    }, [historyVersion]);

    function refreshHistory() {
        setHistoryLoading(true);
        setHistoryError("");
        setHistoryVersion((current) => current + 1);
    }

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

            // Keep the baseline until the user explicitly chooses another run.
            setBaselineRun((current) => current ?? summary);
            setComparisonRun(summary);

            if (options.method === "POST") {
                refreshHistory();
            }
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setRunning(false);
        }
    }

    async function loadComparisonRun(
        runId: string,
        slot: "baseline" | "comparison",
    ) {
        if (!runId) return;

        setRunning(true);
        setError("");

        try {
            const query = new URLSearchParams({ runId });
            const response = await fetch("/api/simulate?" + query, {
                cache: "no-store",
            });

            if (!response.ok) {
                const problem = await response.json();
                throw new Error(problem.error ?? "Could not load this saved run.");
            }

            const savedRun: DemoRun = await response.json();

            // Comparison choices do not restore inputs into the editor.
            if (slot === "baseline") {
                setBaselineRun(savedRun);
            } else {
                setComparisonRun(savedRun);
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : "Could not load this saved run.");
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
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <label htmlFor="saved-run-select">Recent saved runs (latest 50)</label>
                    <select
                        id="saved-run-select"
                        className="border px-2 py-1"
                        value={runIdToLoad}
                        disabled={running || historyLoading}
                        onChange={(event) => setRunIdToLoad(event.currentTarget.value)}
                    >
                        <option value="">Choose a saved run</option>
                        {runIdToLoad && !savedRuns.some((run) => run.id === runIdToLoad) && (
                            <option value={runIdToLoad}>Entered run ID</option>
                        )}
                        {savedRuns.map((run) => (
                            <option key={run.id} value={run.id}>
                                {new Date(run.createdAt).toLocaleString() + " - " + run.trialCount + " trials - " + run.id.slice(0, 8)}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="rounded border px-3 py-1 disabled:opacity-60"
                        disabled={running || historyLoading}
                        onClick={refreshHistory}
                    >
                        Refresh runs
                    </button>
                </div>
                {historyLoading && <p role="status">Loading saved runs...</p>}
                {historyError && <p role="alert">{historyError}</p>}
                {!historyLoading && !historyError && savedRuns.length === 0 && (
                    <p role="status">No saved runs yet.</p>
                )}
                <label htmlFor="saved-run-id">Saved run ID</label>
                <input
                    id="saved-run-id"
                    disabled={running}
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

            <section className="mt-6 rounded border p-4">
                <h3 className="mb-3 font-semibold">Compare saved runs</h3>
                <p className="mb-3">
                    New simulations update the comparison. Your baseline stays pinned until you choose another run. Selections reset on page reload.
                </p>

                {(["baseline", "comparison"] as const).map((slot) => {
                    const selectedRun = slot === "baseline" ? baselineRun : comparisonRun;

                    return (
                        <div key={slot} className="mb-3">
                            <label>
                                {slot === "baseline" ? "Baseline run" : "Comparison run"}
                                <select
                                    className="ml-2 border px-2 py-1"
                                    value={selectedRun?.runId ?? ""}
                                    disabled={running || historyLoading}
                                    onChange={(event) => void loadComparisonRun(
                                        event.currentTarget.value,
                                        slot,
                                    )
                                }
                            >
                                <option value="" disabled>Choose a saved run</option>

                                {selectedRun && !savedRuns.some((run) => run.id === selectedRun.runId
                                    ) && (
                                        <option value={selectedRun.runId}>
                                            {"Loaded run - " + selectedRun.runId}
                                        </option>
                                    )}
                                
                                {savedRuns.map((run) => (
                                    <option key={run.id} value={run.id}>
                                        {new Date(run.createdAt).toLocaleString() + " - " + run.trialCount + " trials - " + run.id.slice(0, 8)}
                                    </option>
                                ))}
                            </select>
                            </label>
                            <p className="text-sm">
                                {selectedRun ? "Selected run ID: " + selectedRun.runId : "No run selected yet."}
                            </p>
                        </div>
                    );
                })}

                {baselineRun && comparisonRun ? (
                    <div className="mt-4">
                        <p>
                            Baseline: {baselineRun.trialCount} trials,
                            {" "}{baselineRun.roundLimit}-round cap,
                            {" "}{baselineRun.unresolvedTrials} unresolved.
                        </p>
                        <p>
                            Comparison: {comparisonRun.trialCount} trials,
                            {" "}{comparisonRun.roundLimit}-round cap,
                            {" "}{comparisonRun.unresolvedTrials} unresolved.
                        </p>

                        {(baselineRun.trialCount !== comparisonRun.trialCount ||
                            baselineRun.roundLimit !== comparisonRun.roundLimit) && (
                                <p className="mt-2">
                                    These runs used different trial counts or round caps.
                                    Consider those settings when interpreting differences.
                                </p>
                        )}

                        {baselineRun.runId === comparisonRun.runId && (
                            <p className="mt-2">
                                Both selections refer to the same saved run.
                            </p>
                        )}

                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <caption className="mb-2 text-left">
                                    Outcome comparison: change = comparison minus baseline.
                                </caption>
                                <thead>
                                    <tr className="border-b">
                                        <th scope="col" className="p-2">Measure</th>
                                        <th scope="col" className="p-2">Baseline</th>
                                        <th scope="col" className="p-2">Comparison</th>
                                        <th scope="col" className="p-2">Change</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COMPARISON_METRICS.map(metric => {
                                        const baselineValue = metric.value(baselineRun);
                                        const comparisonValue = metric.value(comparisonRun);

                                        return (
                                            <tr key={metric.label} className="border-b">
                                                <th scope="row" className="p-2 font-normal">
                                                    {metric.label}
                                                </th>
                                                <td className="p-2">
                                                    {formatMetric(baselineValue, metric.unit)}
                                                </td>
                                                <td className="p-2">
                                                    {formatMetric(comparisonValue, metric.unit)}
                                                </td>
                                                <td className="p-2">
                                                    {formatDifference(baselineValue, comparisonValue, metric.unit,)}
                                                </td>
                                            </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>

                        <p className="mt-3 text-sm">
                            Win chances use all trials. Average rounds, knockout chances and remaining HP use completed battles only.
                            Unavailable means the metric was not saved or no battles completed.
                        </p>
                        <p className="text-sm">
                            pp means percentage points. Positive changes mean a higher value, which is not always a better outcome.
                            Differences are estimates from simulated trials.
                        </p>
                    </div>
                ) : (
                    <p className="mt-3">
                        Select both runs to compare their results.
                    </p>
                )}
            </section>

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
