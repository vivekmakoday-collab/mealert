-- AI-generated get-ahead tasks for a given day's meals (soak, marinate, thaw,
-- chop, make dough, etc). Generated for tomorrow, checked off tonight.

create table if not exists prep_tasks (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  task_date   date not null,              -- the day the prep is FOR
  title       text not null,              -- short actionable instruction
  detail      text,                       -- optional extra context
  meal_name   text,                       -- which meal it supports
  is_done     boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists prep_tasks_family_date_idx
  on prep_tasks (family_id, task_date);

alter table prep_tasks enable row level security;

drop policy if exists "prep_tasks_all" on prep_tasks;
create policy "prep_tasks_all" on prep_tasks
  for all using (family_id = get_family_id());
