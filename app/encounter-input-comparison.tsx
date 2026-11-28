import type { CombatantInput, EncounterInput } from "@/lib/combat/types";  

type InputChange = {
    key: string;
    label: string;
    baseline: string;
    comparison: string;
};

const COMBATANT_FIELDS: {
    key: Exclude<keyof CombatantInput, "id">;
    label: string;
}[] = [
    { key: "name", label: "Name" },
    { key: "side", label: "Side" },
    { key: "startingHP", label: "Starting HP" },
    { key: "armorClass", label: "Armor Class" },
    { key: "initiativeModifier", label: "Initiative Modifier" },
    { key: "attackBonus", label: "Attack Bonus" },
    { key: "damageDice", label: "Damage Dice" },
    { key: "damageModifier", label: "Damage Modifier" },
    { key: "attacksPerTurn", label: "Attacks Per Turn" },
];

function formatInput(
    value: string | number | undefined,
    field: keyof CombatantInput,
): string {
    if (value == null) return "Not present";

    return field === "side" ? "Side " + String(value).toUpperCase() : String(value);
}

function getInputChanges(
    baseline: EncounterInput,
    comparison: EncounterInput,
): InputChange[] {
    const changes: InputChange[] = [];

    for (const side of ["a", "b"] as const) {
        const field = side === "a" ? "sideATargeting" : "sideBTargeting";
        const before = baseline[field];
        const after = comparison[field];

        if (before !== after) {
            changes.push({
                key: field,
                label: "Side " + side.toUpperCase() + " targeting",
                baseline: before === "random" ? "Random living opponent" : "Lowest current HP",
                comparison: before === "random" ? "Random living opponent" : "Lowest current HP",
            });
        }
    }

    // IDs preserve identity when a combatant is renamed or moved in the list.
    const baselineById = new Map(
        baseline.combatants.map((member) => [member.id, member])
    );
    const comparisonById = new Map(
        comparison.combatants.map((member) => [member.id, member])
    );
    const ids = new Set([
        ...baselineById.keys(),
        ...comparisonById.keys(),
    ]);

    for (const id of ids) {
        const before = baselineById.get(id);
        const after = comparisonById.get(id);
        const status = !before ? "Added: " : !after ? "Removed: " : "";
        const name = after?.name ?? before?.name ?? "Combatant";
        const memberLabel = status + name + " [" + id.slice(0, 8) + "]";

        for (const field of COMBATANT_FIELDS) {
            const oldValue = before?.[field.key];
            const newValue = after?.[field.key];

            if (oldValue !== newValue) {
                changes.push({
                    key: id + ":" + field.key,
                    label: memberLabel + " / " + field.label,
                    baseline: formatInput(oldValue, field.key),
                    comparison: formatInput(newValue, field.key),
                });
            } 
        }
    }

    return changes;
}

export default function EncounterInputComparison({
    baseline,
    comparison,
}: {
    baseline: EncounterInput;
    comparison: EncounterInput;
}) {
    const changes = getInputChanges(baseline, comparison);

    return (
        <section className="mt-6">
            <h4 className="font-semibold">Encounter input changes</h4>
            <p className="mb-3 text-sm">
                These are saved inputs. Combatants are matched by ID.
                New IDs appear as additions or removals.
            </p>

            {changes.length === 0 ? (
                <p>No differences in combatants, stats or targeting</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <caption className="mb-2 text-left">
                            Changed inputs only
                        </caption>
                        <thead>
                            <tr className="border-b">
                                <th scope="col" className="p-2">Input</th>
                                <th scope="col" className="p-2">Baseline</th>
                                <th scope="col" className="p-2">Comparison</th>
                            </tr>
                        </thead>
                        <tbody>
                            {changes.map((change) => (
                                <tr key={change.key} className="border-b">
                                    <th scope="row" className="p-2 font-normal">{change.label}</th>
                                    <td className="p-2">{change.baseline}</td>
                                    <td className="p-2">{change.comparison}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}