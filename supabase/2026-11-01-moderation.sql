-- Report and block players (App Store guideline 1.2). Paste into Supabase → SQL Editor and run once.
-- Safe to run again. Review reports in Table Editor → player_reports.

create table if not exists public.player_reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references public.profiles (id) on delete cascade,
  reported uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('name', 'cheating', 'harassment', 'other')),
  -- Snapshot of the name and where it was seen, since names can change.
  reported_name text check (char_length(reported_name) <= 40),
  context text check (char_length(context) <= 40),
  created_at timestamptz not null default now(),
  check (reporter <> reported)
);
create unique index if not exists player_reports_once on public.player_reports (reporter, reported, reason);

create table if not exists public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

alter table public.player_reports enable row level security;
alter table public.blocks enable row level security;

-- Players can file reports but not read them.
drop policy if exists "reports insert own" on public.player_reports;
create policy "reports insert own" on public.player_reports
  for insert to authenticated with check (reporter = auth.uid());

drop policy if exists "blocks read own" on public.blocks;
create policy "blocks read own" on public.blocks
  for select to authenticated using (blocker = auth.uid());

drop policy if exists "blocks delete own" on public.blocks;
create policy "blocks delete own" on public.blocks
  for delete to authenticated using (blocker = auth.uid());

-- Blocking also ends any friendship, both ways.
create or replace function public.block_player(p_other uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_other = auth.uid() then raise exception 'You can''t block yourself'; end if;
  insert into blocks (blocker, blocked) values (auth.uid(), p_other) on conflict do nothing;
  delete from friendships
  where (user_id = auth.uid() and friend_id = p_other) or (user_id = p_other and friend_id = auth.uid());
end;
$$;

-- Same as before, but refuses when either player has blocked the other.
create or replace function public.add_friend(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  other uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into other from profiles where friend_code = upper(trim(p_code));
  if other is null then raise exception 'No miner with that code'; end if;
  if other = auth.uid() then raise exception 'That is your own code'; end if;
  if exists (
    select 1 from blocks
    where (blocker = auth.uid() and blocked = other) or (blocker = other and blocked = auth.uid())
  ) then
    raise exception 'You can''t add this miner';
  end if;
  insert into friendships (user_id, friend_id) values (auth.uid(), other) on conflict do nothing;
  insert into friendships (user_id, friend_id) values (other, auth.uid()) on conflict do nothing;
  return other;
end;
$$;

grant execute on function public.block_player(uuid) to authenticated;
grant execute on function public.add_friend(text) to authenticated;
