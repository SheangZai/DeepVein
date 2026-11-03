-- Topic of the Week results, the weekly top list, and the "miners dug today" counter.
-- Paste into Supabase → SQL Editor and run once. Safe to run again.

create table if not exists public.weekly_results (
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_no int not null check (week_no > 0),
  topic text not null check (char_length(topic) <= 20),
  score int not null check (score between 0 and 100000),
  grid text not null check (char_length(grid) <= 64),
  created_at timestamptz not null default now(),
  primary key (user_id, week_no)
);
create index if not exists weekly_results_week_score on public.weekly_results (week_no, score desc);

alter table public.weekly_results enable row level security;

create or replace function public.has_played_week(p_week int)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from weekly_results where user_id = auth.uid() and week_no = p_week);
$$;

-- Same rule as the daily: your own results, and friends' once you've played that week.
drop policy if exists "weekly readable" on public.weekly_results;
create policy "weekly readable" on public.weekly_results
  for select to authenticated
  using (user_id = auth.uid() or (public.is_friend(user_id) and public.has_played_week(week_no)));

drop policy if exists "weekly insert own" on public.weekly_results;
create policy "weekly insert own" on public.weekly_results
  for insert to authenticated with check (user_id = auth.uid());

-- How you rank against everyone who played a week.
create or replace function public.week_rank(p_week int, p_score int)
returns table (deeper int, total int) language sql stable security definer set search_path = public as $$
  select count(*) filter (where score > p_score)::int, count(*)::int
  from weekly_results where week_no = p_week;
$$;

-- Top scores of a week (names and emoji grids only).
create or replace function public.week_top(p_week int, p_limit int default 10)
returns table (user_id uuid, display_name text, score int, grid text)
language sql stable security definer set search_path = public as $$
  select w.user_id, p.display_name, w.score, w.grid
  from weekly_results w join profiles p on p.id = w.user_id
  where w.week_no = p_week
  order by w.score desc, w.created_at asc
  limit least(greatest(p_limit, 1), 50);
$$;

-- How many miners have finished a daily dig.
create or replace function public.dig_count(p_dig int)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from daily_results where dig_no = p_dig;
$$;

grant execute on function public.has_played_week(int) to authenticated;
grant execute on function public.week_rank(int, int) to authenticated;
grant execute on function public.week_top(int, int) to authenticated;
-- Home screen shows this before anyone signs in, so no account is needed.
grant execute on function public.dig_count(int) to anon, authenticated;
