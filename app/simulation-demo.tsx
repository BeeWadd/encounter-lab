"use client";

import { useState } from "react";
import type { simulateBatch } from "@/lib/combat/batch";

type DemoRun = ReturnType<typeof simulateBatch> & {
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
            }),
        });
    }

    return (
        <section className="mt-10">
            <h2 className="mb-3 text-2x1 font-semibold">Practice simulation</h2>
            <p className="mb-3">Adventurer vs. Practice Opponent</p>
            <fieldset disabled={running}>
                <label>
                    Adventurer starting HP
                    <input
                        type="number" min={1} max={999} step={1}
                        value={sideAHp}
                        onChange={(event) => setSideAHp(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Practice Opponent starting HP
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
                    </ul>
                )}
            </div>
        </section>
    );
}
