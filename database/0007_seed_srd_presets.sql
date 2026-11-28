begin;

-- SRD 5.1 attacks-only adaptations. See public/preset-sources.md.
-- Stable IDs let this seed run again withou creating duplicate presets.
insert into public.profiles (
    id,
    name,
    starting_hp,
    armor_class,
    initiative_modifier,
    attack_bonus,
    damage_dice,
    damage_modifier,
    attacks_per_turn
)
values
    (md5('guard-srd51')::uuid, 'Guard (SRD 5.1)', 11, 16, 1, 3, '1d6', 1, 1),
    (md5('goblin-srd51')::uuid, 'Goblin (SRD 5.1)', 7, 15, 2, 4, '1d6', 2, 1),
    (md5('skeleton-srd51')::uuid, 'Skeleton (SRD 5.1)', 13, 13, 2, 4, '1d6', 2, 1)
on conflict (id) do nothing;

commit;