import { Suspense } from "react";
import { connection } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";
import type { CombatantPreset } from "@/lib/combat/presets";
import SimulationDemo from "./simulation-demo";

async function EncounterWorkspace() {
  await connection();

  const { data: profiles, error } = await createSupabaseClient()
    .from("profiles")
    .select("id, name, starting_hp, armor_class, initiative_modifier, attack_bonus, damage_dice, damage_modifier, attacks_per_turn")
    .order("name");

  if (error) {
    console.error("Could not load presets:", error.message);
  }

  // Send public stats to the editor. Database access stays on server side.
  const presets: CombatantPreset[] = error ? [] : (profiles ?? []).map((profile) => ({
    profileId: profile.id,
    stats: {
      name: profile.name,
      startingHP: profile.starting_hp,
      armorClass: profile.armor_class,
      initiativeModifier: profile.initiative_modifier,
      attackBonus: profile.attack_bonus,
      damageDice: profile.damage_dice,
      damageModifier: profile.damage_modifier,
      attacksPerTurn: profile.attacks_per_turn,
    },
  }));

  return (
    <>
      {error && (
        <p role="alert">
          Could not load presets. Combatants can still be edited manually.
        </p>
      )}
      {!error && presets.length === 0 && (
        <p>No presets are available yet.</p>
      )}
      <SimulationDemo presets={presets} />
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="mb-4 text-4xl font-bold">Encounter Lab</h1>
      <p className="text-lg leading-relaxed">
        A tool for Dungeon Masters to compare how changes to an encounter affect its difficulty and duration.
      </p>

      <Suspense fallback={<p>Loading encounter editor...</p>}>
        <EncounterWorkspace />
      </Suspense>
    </main>
  );
}