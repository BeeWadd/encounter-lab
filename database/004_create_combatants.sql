begin;

create table public.combatants (
    id uuid primary key default gen_random_uuid(),
    encounter_id uuid not null references public.encounters(id),
    source_profile_id uuid references public.profiles(id),
    side text not null check (side in ('a', 'b')),
    name text not null check (length(trim(name)) > 0),
    starting_hp integer not null check (starting_hp > 0),
    armor_class integer not null,
    initiative_modifier integer not null default 0,
    attack_bonus integer not null,
    damage_dice text not null,
    damage_modifier integer not null default 0,
    attacks_per_turn integer not null default 1 check (attacks_per_turn > 0)
);

create index combatants_encounter_id_idx
    on public.combatants(encounter_id);

alter table public.combatants enable row level security;

commit;