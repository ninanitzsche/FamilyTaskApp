-- Migration 009: Elternbereich "Mein Tag" — Self-Care & Tages-Picks
-- Run this in Supabase SQL Editor
--
-- Neue Tabellen:
--   self_care_items       Bibliothek (globaler Seed + familieneigene Items)
--   member_self_care      persönliche Auswahl + Reihenfolge
--   self_care_completions tägliches Abhaken (unique pro Tag)
--   my_day_tasks          "Heute"-Picks (WIP-Limit wird in der Anwendung erzwungen)
--
-- Alle Statements sind idempotent.

create table if not exists self_care_items (
  id bigint primary key generated always as identity,
  family_id bigint references families(id) on delete cascade,
  category text not null check (category in ('meds','movement','basics','rest','morning_evening')),
  label text not null,
  emoji text not null default '✅',
  time_of_day text not null default 'any' check (time_of_day in ('morning','evening','any')),
  created_at timestamptz not null default now()
);

create table if not exists member_self_care (
  id bigint primary key generated always as identity,
  member_id bigint references members(id) on delete cascade not null,
  item_id bigint references self_care_items(id) on delete cascade not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint member_self_care_member_item_unique unique (member_id, item_id)
);

create table if not exists self_care_completions (
  id bigint primary key generated always as identity,
  member_id bigint references members(id) on delete cascade not null,
  item_id bigint references self_care_items(id) on delete cascade not null,
  done_date date not null,
  completed_at timestamptz not null default now(),
  constraint self_care_completions_unique unique (member_id, item_id, done_date)
);

create table if not exists my_day_tasks (
  id bigint primary key generated always as identity,
  member_id bigint references members(id) on delete cascade not null,
  task_id bigint references tasks(id) on delete cascade not null,
  day date not null,
  position int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint my_day_tasks_unique unique (member_id, task_id, day)
);

create index if not exists self_care_items_family_idx on self_care_items(family_id);
create index if not exists member_self_care_member_idx on member_self_care(member_id);
create index if not exists self_care_completions_member_date_idx on self_care_completions(member_id, done_date);
create index if not exists my_day_tasks_member_day_idx on my_day_tasks(member_id, day);

-- Seed: globale Bibliothek (family_id null)
insert into self_care_items (category, label, emoji, time_of_day)
select * from (values
  ('meds','Medikamente','💊','any'),
  ('meds','Medikamente morgens','🌅','morning'),
  ('meds','Vitamine','💉','any'),
  ('movement','Spaziergang','🚶','any'),
  ('movement','Dehnen','🧘','morning'),
  ('movement','Bewegung','🏃','any'),
  ('basics','Wasser trinken','💧','any'),
  ('basics','Essen','🍎','any'),
  ('basics','Pause machen','🛋️','any'),
  ('rest','Lesen','📚','evening'),
  ('rest','Hobby-Zeit','🧩','any'),
  ('rest','Ruhe','😴','any'),
  ('morning_evening','Zähne putzen','🪥','morning'),
  ('morning_evening','Pflege-Routine','🧴','evening'),
  ('morning_evening','Bildschirmzeit beenden','📵','evening'),
  ('morning_evening','Abendplan (morgen bereit)','🎒','evening')
) as seed(category, label, emoji, time_of_day)
where not exists (select 1 from self_care_items where family_id is null and label = seed.label);

-- RLS
alter table self_care_items enable row level security;
alter table member_self_care enable row level security;
alter table self_care_completions enable row level security;
alter table my_day_tasks enable row level security;

-- self_care_items: SELECT global + familieneigen; INSERT/UPDATE/DELETE nur Eltern
drop policy if exists "members can read self care items" on self_care_items;
create policy "members can read self care items"
  on self_care_items for select to authenticated
  using (family_id is null or family_id = public.get_family_id_for_auth_uid());

drop policy if exists "parents can insert self care items" on self_care_items;
create policy "parents can insert self care items"
  on self_care_items for insert to authenticated
  with check (
    family_id = public.get_family_id_for_auth_uid()
    and exists (select 1 from members m where m.auth_id = auth.uid() and m.role = 'parent')
  );

drop policy if exists "parents can update self care items" on self_care_items;
create policy "parents can update self care items"
  on self_care_items for update to authenticated
  using (
    family_id = public.get_family_id_for_auth_uid()
    and exists (select 1 from members m where m.auth_id = auth.uid() and m.role = 'parent')
  )
  with check (
    family_id = public.get_family_id_for_auth_uid()
    and exists (select 1 from members m where m.auth_id = auth.uid() and m.role = 'parent')
  );

drop policy if exists "parents can delete self care items" on self_care_items;
create policy "parents can delete self care items"
  on self_care_items for delete to authenticated
  using (
    family_id = public.get_family_id_for_auth_uid()
    and exists (select 1 from members m where m.auth_id = auth.uid() and m.role = 'parent')
  );

-- member_self_care: nur eigenes Mitglied
drop policy if exists "members can read own self care selection" on member_self_care;
create policy "members can read own self care selection"
  on member_self_care for select to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can insert own self care selection" on member_self_care;
create policy "members can insert own self care selection"
  on member_self_care for insert to authenticated
  with check (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can delete own self care selection" on member_self_care;
create policy "members can delete own self care selection"
  on member_self_care for delete to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()));

-- self_care_completions: nur eigenes Mitglied
drop policy if exists "members can read own completions" on self_care_completions;
create policy "members can read own completions"
  on self_care_completions for select to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can insert own completions" on self_care_completions;
create policy "members can insert own completions"
  on self_care_completions for insert to authenticated
  with check (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can delete own completions" on self_care_completions;
create policy "members can delete own completions"
  on self_care_completions for delete to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()));

-- my_day_tasks: nur eigenes Mitglied
drop policy if exists "members can read own my day tasks" on my_day_tasks;
create policy "members can read own my day tasks"
  on my_day_tasks for select to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can insert own my day tasks" on my_day_tasks;
create policy "members can insert own my day tasks"
  on my_day_tasks for insert to authenticated
  with check (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can update own my day tasks" on my_day_tasks;
create policy "members can update own my day tasks"
  on my_day_tasks for update to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()))
  with check (member_id in (select id from members where auth_id = auth.uid()));

drop policy if exists "members can delete own my day tasks" on my_day_tasks;
create policy "members can delete own my day tasks"
  on my_day_tasks for delete to authenticated
  using (member_id in (select id from members where auth_id = auth.uid()));
