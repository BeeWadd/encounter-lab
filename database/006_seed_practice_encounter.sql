begin;

-- Give every practice run the same parent encounter.
insert into public.encounters (id, name, side_a_targeting, side_b_targeting)
values (
    '2fc5cb48-755c-4d33-a4a9-4e5b52053d72',
    'Practice Encounter',
    'random',
    'random'
)
on conflict (id) do nothing;

-- Let the backend insert a run and read back its ID.
grant insert, select on public.simulation_runs to service_role;

commit;