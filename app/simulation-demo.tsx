"use client";

import { useState } from "react";
import type { simulateBatch } from "@/lib/combat/batch";

type DemoRun = ReturnType<typeof simulateBatch> & {
    trialCount: number;
    roundLimit: number;
};

export default function SimulationDemo() {
    const [result, setResult] = useState<DemoRun | null>(null);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");

    async function runSimulation() {
        setRunning(true);
        setError("");
        setResult(null);

        try {
            // The browser requests a run. The route executes the engine on the server.
            const response = await fetch("/api/simulate", { method: "POST" });
            if (!response.ok) {
                throw new Error("Simulation request failed.");
            }

            const summary: DemoRun = await response.json();
            setResult(summary);
        } catch {
            setError("Could not run the simulation. Please try again.");
        } finally {
            // Re-enable the button whether the request succeeds or fails.
            setRunning(false);
        }
    }

    return (
        <section className="mt-10">
            <h2 className="mb-3 text-2x1 font-semibold">Practice simulation</h2>
            <p className="mb-3">Adventurer vs. Practice Opponent</p>
            <button
                type="button"
                onClick={runSimulation}
                disabled={running}
                className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-60"
            >
                {running ? "Running" : "Run Simulation"}
            </button>

            <div className="mt-3" aria-live="polite">
                {error && <p>{error}</p>}
                {result && (
                    <ul>
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
