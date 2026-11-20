"use client";

import { useState } from "react";
import type { simulateBatch } from "@/lib/combat/batch";

type BatchSummary = ReturnType<typeof simulateBatch>;

type DemoRun = Omit<BatchSummary, "metricScope" | "knockoutPercent" | "averageRemainingHP"> & {
    // Older saved summaries do not contain these fields.
    metricScope?: BatchSummary["metricScope"];
    knockoutPercent?: BatchSummary["knockoutPercent"];
    averageRemainingHP?: BatchSummary["averageRemainingHP"];
    trialCount: number;
    roundLimit: number;
    runId: string;
};

export default function SimulationDemo() {
    const [result, setResult] = useState<DemoRun | null>(null);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");
    const [runIdToLoad, setRunIdToLoad] = useState("");
    const [sideAHp, setSideAHp] = useState("12");
    const [sideBHp, setSideBHp] = useState("10");
    const [sideAArmorClass, setSideAArmorClass] = useState("13");
    const [sideBArmorClass, setSideBArmorClass] = useState("12");
    const [sideAAttackBonus, setSideAAttackBonus] = useState("3");
    const [sideBAttackBonus, setSideBAttackBonus] = useState("3");
    const [sideADamageDice, setSideADamageDice] = useState("1d6");
    const [sideBDamageDice, setSideBDamageDice] = useState("1d6");
    const [sideADamageModifier, setSideADamageModifier] = useState("2");
    const [sideBDamageModifier, setSideBDamageModifier] = useState("1");
    const [sideAInitiativeModifier, setSideAInitiativeModifier] = useState("1");
    const [sideBInitiativeModifier, setSideBInitiativeModifier] = useState("1");
    const [sideAAttacksPerTurn, setSideAAttacksPerTurn] = useState("1");
    const [sideBAttacksPerTurn, setSideBAttacksPerTurn] = useState("1");

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
            setResult(summary);
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setRunning(false);
        }
    }
    
    function runSimulation() {
        return requestRun("/api/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                sideAHp: Number(sideAHp), 
                sideBHp: Number(sideBHp),
                sideAArmorClass: Number(sideAArmorClass),
                sideBArmorClass: Number(sideBArmorClass), 
                sideAAttackBonus: sideAAttackBonus.trim() === "" ? null : Number(sideAAttackBonus),
                sideBAttackBonus: sideBAttackBonus.trim() === "" ? null : Number(sideBAttackBonus),
                sideADamageDice: sideADamageDice.trim(),
                sideBDamageDice: sideBDamageDice.trim(),
                sideADamageModifier: sideADamageModifier.trim() === "" ? null : Number(sideADamageModifier),
                sideBDamageModifier: sideBDamageModifier.trim() === "" ? null : Number(sideBDamageModifier),
                sideAInitiativeModifier: sideAInitiativeModifier.trim() === "" ? null : Number(sideAInitiativeModifier),
                sideBInitiativeModifier: sideBInitiativeModifier.trim() === "" ? null : Number(sideBInitiativeModifier),
                sideAAttacksPerTurn: sideAAttacksPerTurn.trim() === "" ? null : Number(sideAAttacksPerTurn),
                sideBAttacksPerTurn: sideBAttacksPerTurn.trim() === "" ? null : Number(sideBAttacksPerTurn),
            }),
        });
    }

    return (
        <section className="mt-10">
            <h2 className="mb-3 text-2x1 font-semibold">Practice simulation</h2>
            <p className="mb-3">Adventurer vs. Practice Opponent</p>
            <fieldset disabled={running}>
                <label>
                    Adventurer Starting HP
                    <input
                        type="number" min={1} max={999} step={1}
                        value={sideAHp}
                        onChange={(event) => setSideAHp(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Practice Opponent Starting HP
                    <input
                        type="number" min={1} max={999} step={1}
                        value={sideBHp}
                        onChange={(event) => setSideBHp(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Adventurer Armor Class
                    <input
                        type="number" min={1} step={1}
                        value={sideAArmorClass}
                        onChange={(event) => setSideAArmorClass(event.currentTarget.value)}
                        />
                </label>
                <label>
                    Practice Opponent Armor Class
                    <input
                        type="number" min={1} step={1}
                        value={sideBArmorClass}
                        onChange={(event) => setSideBArmorClass(event.currentTarget.value)}
                        />
                </label>
                <label>
                    Adventurer Attack Bonus
                    <input
                        type="number" min={-20} max={20} step={1}
                        value={sideAAttackBonus}
                        onChange={(event) => setSideAAttackBonus(event.currentTarget.value)}
                        />
                </label>
                <label>
                    Practice Opponent Attack Bonus
                    <input
                        type="number" min={-20} max={20} step={1}
                        value={sideBAttackBonus}
                        onChange={(event) => setSideBAttackBonus(event.currentTarget.value)}
                        />
                </label>
                <label>
                    Adventurer Damage Dice
                    <input
                        type="text"
                        value={sideADamageDice}
                        onChange={(event) => setSideADamageDice(event.currentTarget.value)}
                        />
                </label>
                <label>
                    Adventurer Damage Modifier
                    <input
                        type="number" min={-20} max={20} step={1}
                        value={sideADamageModifier}
                        onChange={(event) => setSideADamageModifier(event.currentTarget.value)}
                        />
                </label>
                <label>
                    Practice Opponent Damage Dice
                    <input
                        type="text"
                        value={sideBDamageDice}
                        onChange={(event) => setSideBDamageDice(event.currentTarget.value)}
                        />
                </label>
                <label>
                    Practice Opponent Damage Modifier
                    <input
                        type="number" min={-20} max={20} step={1}
                        value={sideBDamageModifier}
                        onChange={(event) => setSideBDamageModifier(event.currentTarget.value)}
                        />
                </label>
                <label>
                    Adventurer Initiative Modifier
                    <input
                        type="number" min={-20} max={20} step={1}
                        value={sideAInitiativeModifier}
                        onChange={(event) => setSideAInitiativeModifier(event.currentTarget.value)}
                        />
                </label>
                <label>
                    Adventurer Attacks Per Turn
                    <input
                        type="number" min={1} max={10} step={1}
                        value={sideAAttacksPerTurn}
                        onChange={(event) => setSideAAttacksPerTurn(event.currentTarget.value)}
                        />
                </label>
                <label>
                    Practice Opponent Initiative Modifier
                    <input
                        type="number" min={-20} max={20} step={1}
                        value={sideBInitiativeModifier}
                        onChange={(event) => setSideBInitiativeModifier(event.currentTarget.value)}
                        />
                </label>
                <label>
                    Practice Opponent Atacks Per Turn
                    <input
                        type="number" min={1} max={10} step={1}
                        value={sideBAttacksPerTurn}
                        onChange={(event) => setSideBAttacksPerTurn(event.currentTarget.value)}
                        />
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
                        <li>Adventurer wins: {result.winPercent.a.toFixed(1)}%</li>
                        <li>Practice Opponent wins: {result.winPercent.b.toFixed(1)}%</li>
                        <li>Unresolved: {result.unresolvedTrials}</li>
                        <li>
                            Average completed rounds:{" "}
                            {result.averageCompletedRounds?.toFixed(1) ?? "None"}
                        </li>
                        <li>Knockout and HP metrics use completed battles only.</li>
                        <li>
                            Adventurer chance of at least one knockout:{" "}
                            {result.knockoutPercent ? result.knockoutPercent.a.toFixed(1) : "Unavailable"}
                        </li>
                        <li>
                            Practice Opponent chance of at least one knockout:{" "}
                            {result.knockoutPercent ? result.knockoutPercent.b.toFixed(1) : "Unavailable"}
                        </li>
                        <li>
                            Adventurer average remaining total HP:{" "}
                            {result.averageRemainingHP?.a.toFixed(1) ?? "Unavailable"}
                        </li>
                        <li>
                            Practice Opponent average remaining total HP:{" "}
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
