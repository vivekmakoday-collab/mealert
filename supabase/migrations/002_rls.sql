-- Enable RLS on all tables
alter table families enable row level security;
alter table members enable row level security;
alter table meals enable row level security;
alter table meal_plan_days enable row level security;
alter table meal_ingredients enable row level security;

-- Helper: get the family_id stored in the logged-in user's metadata
create or replace function get_family_id()
returns uuid language sql stable
as $$ select (auth.jwt() -> 'user_metadata' ->> 'family_id')::uuid $$;

-- families: user can only see/edit their own family
create policy "family_select" on families for select using (id = get_family_id());
create policy "family_update" on families for update using (id = get_family_id());

-- members, meals, meal_plan_days, meal_ingredients: scoped to family
create policy "members_all"   on members          for all using (family_id = get_family_id());
create policy "meals_all"     on meals            for all using (family_id = get_family_id());
create policy "plans_all"     on meal_plan_days   for all using (family_id = get_family_id());
create policy "ingredients_all" on meal_ingredients for all
  using (meal_id in (select id from meals where family_id = get_family_id()));
