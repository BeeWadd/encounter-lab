import { Suspense } from "react";
import { connection } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";

async function ProfileList() {
  await connection();

  const supabase = createSupabaseClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, name, starting_hp, armor_class")
    .order("name");

  if (error) {
    console.error("Could not load profiles:", error.message);
    return <p>Could not load profiles. Check the server terminal.</p>;
  }

  if (!profiles || profiles.length === 0) {
    return <p>No profiles have been added yet.</p>;
  }

  return (
    <ul>
      {profiles.map((profile) => (
        <li key={profile.id}>
          {profile.name} - HP {profile.starting_hp}, AC {profile.armor_class}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main>
      <h1>Encounter Lab</h1>
      <p>
        A tool for Dungeon Masters to compare how changes to an encounter affect its difficulty and duration.
      </p>

      <h2>Available profiles</h2>
      <Suspense fallback={<p>Loading profiles...</p>}>
        <ProfileList />
      </Suspense>
    </main>
  );
}