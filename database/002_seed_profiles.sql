insert into public.profiles (
    name,
    starting_hp,
    armor_class,
    initiative_modifier,
    attack_bonus,
    damage_dice,
    damage_modifier,
    attacks_per_turn
)
values (
    'Practice Opponent',
    10,
    12,
    1,
    3,
    '1d6',
    1,
    1
)
returning *;