begin;

create table public.profiles (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(trim(name)) > 0),
    starting_hp integer not null check (starting_hp > 0),
    armor_class integer not null,
    initiative_modifier integer not null default 0,
    attack_bonus integer not null,
    damage_dice text not null,
    damage_modifier integer not null default 0,
    attacks_per_turn integer not null default 1 check (attacks_per_turn > 0)
);

alter table public.profiles enable row level security;

commit;
