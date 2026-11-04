begin;

create table public.simulation_runs (
    id uuid primary key default gen_random_uuid(),
    encounter_id uuid not null references public.encounters(id),
    created_at timestamptz not null default now(),
    seed text not null,
    rules_version text not null,
    engine_version text not null,
    trial_count integer not null check (trial_count > 0),
    round_limit integer not null check (round_limit > 0),
    input_snapshot jsonb not null,
    result_summary jsonb not null
);

create index simulation_runs_encounter_created_idx
    on public.simulation_runs(encounter_id, created_at desc);

alter table public.simulation_runs enable row level security;

commit;
