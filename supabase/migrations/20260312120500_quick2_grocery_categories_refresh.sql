create or replace function public.seed_default_categories(p_household_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.categories (household_id, name, position) values
    (p_household_id, 'Frukt og grønt',                    10),
    (p_household_id, 'Urter og ferdigkuttede grønnsaker', 20),
    (p_household_id, 'Brød og bakervarer',                30),
    (p_household_id, 'Frokostblanding og havregryn',      40),
    (p_household_id, 'Meieriprodukter',                   50),
    (p_household_id, 'Ost',                               60),
    (p_household_id, 'Egg',                               70),
    (p_household_id, 'Ferskt kjøtt',                      80),
    (p_household_id, 'Kylling og kalkun',                 90),
    (p_household_id, 'Fisk og sjømat',                   100),
    (p_household_id, 'Ferdigretter og delikatesse',      110),
    (p_household_id, 'Frysevarer',                       120),
    (p_household_id, 'Pasta, ris og kornprodukter',     130),
    (p_household_id, 'Bakevarer og bakeingredienser',    140),
    (p_household_id, 'Hermetikk og glassvarer',          150),
    (p_household_id, 'Sauser og matoljer',               160),
    (p_household_id, 'Krydder',                          170),
    (p_household_id, 'Snacks',                           180),
    (p_household_id, 'Sjokolade og godteri',             190),
    (p_household_id, 'Drikkevarer',                      200),
    (p_household_id, 'Kaffe og te',                      210),
    (p_household_id, 'Øl og cider',                      220),
    (p_household_id, 'Husholdningsartikler',             230),
    (p_household_id, 'Personlig hygiene',                240),
    (p_household_id, 'Dyremat',                          250);
$$;

with desired_categories(name, position) as (
  values
    ('Frukt og grønt', 10),
    ('Urter og ferdigkuttede grønnsaker', 20),
    ('Brød og bakervarer', 30),
    ('Frokostblanding og havregryn', 40),
    ('Meieriprodukter', 50),
    ('Ost', 60),
    ('Egg', 70),
    ('Ferskt kjøtt', 80),
    ('Kylling og kalkun', 90),
    ('Fisk og sjømat', 100),
    ('Ferdigretter og delikatesse', 110),
    ('Frysevarer', 120),
    ('Pasta, ris og kornprodukter', 130),
    ('Bakevarer og bakeingredienser', 140),
    ('Hermetikk og glassvarer', 150),
    ('Sauser og matoljer', 160),
    ('Krydder', 170),
    ('Snacks', 180),
    ('Sjokolade og godteri', 190),
    ('Drikkevarer', 200),
    ('Kaffe og te', 210),
    ('Øl og cider', 220),
    ('Husholdningsartikler', 230),
    ('Personlig hygiene', 240),
    ('Dyremat', 250)
),
legacy_name_map(old_name, new_name) as (
  values
    ('Brød og bakevarer', 'Brød og bakervarer'),
    ('Pålegg og kjøtt', 'Ferdigretter og delikatesse'),
    ('Meieri og egg', 'Meieriprodukter'),
    ('Kjøtt og fisk', 'Fisk og sjømat'),
    ('Hermetikk og glass', 'Hermetikk og glassvarer'),
    ('Pasta, ris og korn', 'Pasta, ris og kornprodukter'),
    ('Snacks og godteri', 'Snacks'),
    ('Drikke', 'Drikkevarer'),
    ('Rengjøring', 'Husholdningsartikler'),
    ('Helse og hygiene', 'Personlig hygiene'),
    ('Kjøl og frys', 'Frysevarer')
),
desired_names as (
  select name from desired_categories
)
update public.categories c
set name = m.new_name
from legacy_name_map m
where c.name = m.old_name;

with desired_categories(name, position) as (
  values
    ('Frukt og grønt', 10),
    ('Urter og ferdigkuttede grønnsaker', 20),
    ('Brød og bakervarer', 30),
    ('Frokostblanding og havregryn', 40),
    ('Meieriprodukter', 50),
    ('Ost', 60),
    ('Egg', 70),
    ('Ferskt kjøtt', 80),
    ('Kylling og kalkun', 90),
    ('Fisk og sjømat', 100),
    ('Ferdigretter og delikatesse', 110),
    ('Frysevarer', 120),
    ('Pasta, ris og kornprodukter', 130),
    ('Bakevarer og bakeingredienser', 140),
    ('Hermetikk og glassvarer', 150),
    ('Sauser og matoljer', 160),
    ('Krydder', 170),
    ('Snacks', 180),
    ('Sjokolade og godteri', 190),
    ('Drikkevarer', 200),
    ('Kaffe og te', 210),
    ('Øl og cider', 220),
    ('Husholdningsartikler', 230),
    ('Personlig hygiene', 240),
    ('Dyremat', 250)
)
update public.categories c
set position = d.position
from desired_categories d
where c.name = d.name;

with desired_categories(name, position) as (
  values
    ('Frukt og grønt', 10),
    ('Urter og ferdigkuttede grønnsaker', 20),
    ('Brød og bakervarer', 30),
    ('Frokostblanding og havregryn', 40),
    ('Meieriprodukter', 50),
    ('Ost', 60),
    ('Egg', 70),
    ('Ferskt kjøtt', 80),
    ('Kylling og kalkun', 90),
    ('Fisk og sjømat', 100),
    ('Ferdigretter og delikatesse', 110),
    ('Frysevarer', 120),
    ('Pasta, ris og kornprodukter', 130),
    ('Bakevarer og bakeingredienser', 140),
    ('Hermetikk og glassvarer', 150),
    ('Sauser og matoljer', 160),
    ('Krydder', 170),
    ('Snacks', 180),
    ('Sjokolade og godteri', 190),
    ('Drikkevarer', 200),
    ('Kaffe og te', 210),
    ('Øl og cider', 220),
    ('Husholdningsartikler', 230),
    ('Personlig hygiene', 240),
    ('Dyremat', 250)
)
insert into public.categories (household_id, name, position)
select
  h.id,
  d.name,
  d.position
from public.households h
cross join desired_categories d
where not exists (
  select 1
  from public.categories c
  where c.household_id = h.id
    and c.name = d.name
);

with desired_categories(name, position) as (
  values
    ('Frukt og grønt', 10),
    ('Urter og ferdigkuttede grønnsaker', 20),
    ('Brød og bakervarer', 30),
    ('Frokostblanding og havregryn', 40),
    ('Meieriprodukter', 50),
    ('Ost', 60),
    ('Egg', 70),
    ('Ferskt kjøtt', 80),
    ('Kylling og kalkun', 90),
    ('Fisk og sjømat', 100),
    ('Ferdigretter og delikatesse', 110),
    ('Frysevarer', 120),
    ('Pasta, ris og kornprodukter', 130),
    ('Bakevarer og bakeingredienser', 140),
    ('Hermetikk og glassvarer', 150),
    ('Sauser og matoljer', 160),
    ('Krydder', 170),
    ('Snacks', 180),
    ('Sjokolade og godteri', 190),
    ('Drikkevarer', 200),
    ('Kaffe og te', 210),
    ('Øl og cider', 220),
    ('Husholdningsartikler', 230),
    ('Personlig hygiene', 240),
    ('Dyremat', 250)
),
desired_names as (
  select name from desired_categories
),
household_limits as (
  select household_id, coalesce(max(position), 0) as max_position
  from public.categories
  where name in (select name from desired_names)
  group by household_id
),
custom_categories as (
  select
    c.id,
    c.household_id,
    hl.max_position,
    row_number() over (partition by c.household_id order by c.position, c.name) as rn
  from public.categories c
  join household_limits hl on hl.household_id = c.household_id
  where c.name not in (select name from desired_names)
)
update public.categories c
set position = cc.max_position + (cc.rn * 10)
from custom_categories cc
where c.id = cc.id;

with desired_names as (
  select unnest(array[
    'Frukt og grønt',
    'Urter og ferdigkuttede grønnsaker',
    'Brød og bakervarer',
    'Frokostblanding og havregryn',
    'Meieriprodukter',
    'Ost',
    'Egg',
    'Ferskt kjøtt',
    'Kylling og kalkun',
    'Fisk og sjømat',
    'Ferdigretter og delikatesse',
    'Frysevarer',
    'Pasta, ris og kornprodukter',
    'Bakevarer og bakeingredienser',
    'Hermetikk og glassvarer',
    'Sauser og matoljer',
    'Krydder',
    'Snacks',
    'Sjokolade og godteri',
    'Drikkevarer',
    'Kaffe og te',
    'Øl og cider',
    'Husholdningsartikler',
    'Personlig hygiene',
    'Dyremat'
  ]) as name
)
insert into public.store_layouts (store_id, category_id, position)
select
  s.id,
  c.id,
  c.position
from public.stores s
join public.categories c on c.household_id = s.household_id
where c.name in (select name from desired_names)
  and not exists (
    select 1
    from public.store_layouts sl
    where sl.store_id = s.id
      and sl.category_id = c.id
  );

with desired_names as (
  select unnest(array[
    'Frukt og grønt',
    'Urter og ferdigkuttede grønnsaker',
    'Brød og bakervarer',
    'Frokostblanding og havregryn',
    'Meieriprodukter',
    'Ost',
    'Egg',
    'Ferskt kjøtt',
    'Kylling og kalkun',
    'Fisk og sjømat',
    'Ferdigretter og delikatesse',
    'Frysevarer',
    'Pasta, ris og kornprodukter',
    'Bakevarer og bakeingredienser',
    'Hermetikk og glassvarer',
    'Sauser og matoljer',
    'Krydder',
    'Snacks',
    'Sjokolade og godteri',
    'Drikkevarer',
    'Kaffe og te',
    'Øl og cider',
    'Husholdningsartikler',
    'Personlig hygiene',
    'Dyremat'
  ]) as name
)
update public.store_layouts sl
set position = c.position
from public.categories c
where sl.category_id = c.id
  and c.name in (select name from desired_names);

with desired_names as (
  select unnest(array[
    'Frukt og grønt',
    'Urter og ferdigkuttede grønnsaker',
    'Brød og bakervarer',
    'Frokostblanding og havregryn',
    'Meieriprodukter',
    'Ost',
    'Egg',
    'Ferskt kjøtt',
    'Kylling og kalkun',
    'Fisk og sjømat',
    'Ferdigretter og delikatesse',
    'Frysevarer',
    'Pasta, ris og kornprodukter',
    'Bakevarer og bakeingredienser',
    'Hermetikk og glassvarer',
    'Sauser og matoljer',
    'Krydder',
    'Snacks',
    'Sjokolade og godteri',
    'Drikkevarer',
    'Kaffe og te',
    'Øl og cider',
    'Husholdningsartikler',
    'Personlig hygiene',
    'Dyremat'
  ]) as name
),
store_limits as (
  select sl.store_id, coalesce(max(sl.position), 0) as max_position
  from public.store_layouts sl
  join public.categories c on c.id = sl.category_id
  where c.name in (select name from desired_names)
  group by sl.store_id
),
custom_layouts as (
  select
    sl.store_id,
    sl.category_id,
    st.max_position,
    row_number() over (partition by sl.store_id order by sl.position, c.name) as rn
  from public.store_layouts sl
  join public.categories c on c.id = sl.category_id
  join store_limits st on st.store_id = sl.store_id
  where c.name not in (select name from desired_names)
)
update public.store_layouts sl
set position = cl.max_position + (cl.rn * 10)
from custom_layouts cl
where sl.store_id = cl.store_id
  and sl.category_id = cl.category_id;
