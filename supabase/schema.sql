-- Deepvein backend schema. Paste into Supabase → SQL Editor and run once.
-- Also enable: Authentication → Sign In / Providers → "Allow anonymous sign-ins".

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default 'Miner'
    check (char_length(display_name) between 1 and 20),
  friend_code text not null unique
    default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table if not exists public.daily_results (
  user_id uuid not null references public.profiles (id) on delete cascade,
  dig_no int not null check (dig_no > 0),
  score int not null check (score between 0 and 100000),
  grid text not null check (char_length(grid) <= 64),
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, dig_no)
);
create index if not exists daily_results_dig_score on public.daily_results (dig_no, score);

create table if not exists public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- Create a profile for every new auth user (including anonymous ones).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers used by policies (security definer avoids recursive RLS).
create or replace function public.has_played(p_dig int)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from daily_results where user_id = auth.uid() and dig_no = p_dig);
$$;

create or replace function public.is_friend(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships where user_id = auth.uid() and friend_id = p_other);
$$;

alter table public.profiles enable row level security;
alter table public.daily_results enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- You see your own results, and friends' results only once you've played that dig.
drop policy if exists "results readable" on public.daily_results;
create policy "results readable" on public.daily_results
  for select to authenticated
  using (user_id = auth.uid() or (public.is_friend(user_id) and public.has_played(dig_no)));

drop policy if exists "results insert own" on public.daily_results;
create policy "results insert own" on public.daily_results
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "friendships readable" on public.friendships;
create policy "friendships readable" on public.friendships
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "friendships delete own" on public.friendships;
create policy "friendships delete own" on public.friendships
  for delete to authenticated using (user_id = auth.uid() or friend_id = auth.uid());

-- Mutual friendship by code.
create or replace function public.add_friend(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  other uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into other from profiles where friend_code = upper(trim(p_code));
  if other is null then raise exception 'No miner with that code'; end if;
  if other = auth.uid() then raise exception 'That is your own code'; end if;
  insert into friendships (user_id, friend_id) values (auth.uid(), other) on conflict do nothing;
  insert into friendships (user_id, friend_id) values (other, auth.uid()) on conflict do nothing;
  return other;
end;
$$;

-- How you rank against everyone who played a dig.
create or replace function public.dig_rank(p_dig int, p_score int)
returns table (deeper int, total int) language sql stable security definer set search_path = public as $$
  select count(*) filter (where score > p_score)::int, count(*)::int
  from daily_results where dig_no = p_dig;
$$;

-- In-app account deletion (required by the App Store). Cascades to all rows.
create or replace function public.delete_me()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_me() to authenticated;
grant execute on function public.add_friend(text) to authenticated;
grant execute on function public.dig_rank(int, int) to authenticated;
