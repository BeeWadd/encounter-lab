begin;

create table public.encounters (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(trim(name)) > 0),
    side_a_targeting text not null default 'random' check (side_a_targeting in ('random', 'lowest_hp')),
    side_b_targeting text not null default 'random' check (side_b_targeting in ('random', 'lowest_hp'))
);

alter table public.encounters enable row level security;

commit;