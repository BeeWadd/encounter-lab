import type { CombatantInput } from "@/lib/combat/types";

type NumericField = 
    | "startingHP"
    | "armorClass"
    | "initiativeModifier"
    | "attackBonus"
    | "damageModifier"
    | "attacksPerTurn";

// Draft numeric values stay as text so fields can be cleared while editing.
export type CombatantDraft = Omit<CombatantInput, NumericField> & Record<NumericField, string>;
export type EditableCombatantField = Exclude<keyof CombatantDraft, "id" | "side">;

const numericFields: {
    key: NumericField;
    label: string;
    min: number;
    max?: number;
}[] = [
    { key: "startingHP", label: "Starting HP", min: 1, max: 999 },
    { key: "armorClass", label: "Armor Class", min: 1 },
    { key: "initiativeModifier", label: "Initiative Modifier", min: -20, max: 20 },
    { key: "attackBonus", label: "Attack Bonus", min: -20, max: 20 },
    { key: "damageModifier", label: "Damage Modifier", min: -20, max: 20 },
    { key: "attacksPerTurn", label: "Attacks Per Turn", min: 1, max: 10 },
];

type CombatantEditorProps = {
    combatant: CombatantDraft;
    onChange: (field: EditableCombatantField, value: string) => void;
    onRemove: () => void;
    canRemove: boolean;
};

export default function CombatantEditor({
    combatant,
    onChange,
    onRemove,
    canRemove,
}: CombatantEditorProps) {
    return (
        <fieldset className="mb-3 rounded border p-3">
            <legend className="px-1 font-semibold">
                {combatant.name || "Combatant"}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
                <label>
                    Name
                    <input 
                        className="ml-2 border px-2 py-1"
                        value={combatant.name}
                        maxLength={80}
                        onChange={(event) => onChange("name", event.currentTarget.value)}
                        />
                </label>
                <label>
                    Damage Dice
                    <input 
                        className="ml-2 border px-2 py-1"
                        value={combatant.damageDice}
                        maxLength={80}
                        onChange={(event) => onChange("damageDice", event.currentTarget.value)}
                        />
                </label>
                {numericFields.map((field) => (
                    <label key={(field.key)}>
                        {field.label}
                        <input
                            className="ml-2 border px-2 py-1"
                            type="number"
                            min={field.min}
                            max={field.max}
                            step={1}
                            value={combatant[field.key]}
                            onChange={(event) => onChange(field.key, event.currentTarget.value)}
                        />
                    </label>
                ))}
            </div>
            <button
                type="button"
                className="mt-3 rounded border px-3 py-1 disabled:opacity-60"
                disabled={!canRemove}
                onClick={onRemove}
            >Remove Combatant</button>
        </fieldset>
    );
}