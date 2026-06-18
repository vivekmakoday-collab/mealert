create extension if not exists "uuid-ossp";

create table families (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  digest_time time not null default '07:00:00',
  timezone    text not null default 'America/New_York',
  created_at  timestamptz not null default now()
);

create table members (
  id                    uuid primary key default uuid_generate_v4(),
  family_id             uuid not null references families(id) on delete cascade,
  name                  text not null,
  email                 text not null,
  dietary_restrictions  text[] not null default '{}',
  allergies             text[] not null default '{}',
  likes                 text[] not null default '{}',
  dislikes              text[] not null default '{}',
  calorie_target        integer,
  protein_target_g      integer,
  carbs_target_g        integer,
  fat_target_g          integer
);

create table meals (
  id            uuid primary key default uuid_generate_v4(),
  family_id     uuid not null references families(id) on delete cascade,
  name          text not null,
  description   text,
  meal_type     text not null check (meal_type in ('breakfast','lunch','snack','dinner')),
  calories      integer not null default 0,
  protein_g     integer not null default 0,
  carbs_g       integer not null default 0,
  fat_g         integer not null default 0,
  tags          text[] not null default '{}',
  usda_food_id  text
);

create table meal_plan_days (
  id                  uuid primary key default uuid_generate_v4(),
  family_id           uuid not null references families(id) on delete cascade,
  plan_date           date not null,
  breakfast_meal_id   uuid references meals(id) on delete set null,
  lunch_meal_id       uuid references meals(id) on delete set null,
  snack_meal_id       uuid references meals(id) on delete set null,
  dinner_meal_id      uuid references meals(id) on delete set null,
  notes               text,
  unique (family_id, plan_date)
);

create table meal_ingredients (
  id            uuid primary key default uuid_generate_v4(),
  meal_id       uuid not null references meals(id) on delete cascade,
  name          text not null,
  quantity      numeric not null,
  unit          text not null,
  usda_food_id  text,
  calories      integer not null default 0,
  protein_g     integer not null default 0,
  carbs_g       integer not null default 0,
  fat_g         integer not null default 0
);
