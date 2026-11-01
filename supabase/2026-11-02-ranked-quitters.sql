-- Ranked TNT Toss: count games where a player quits. Paste into Supabase → SQL Editor
-- and run once, after 2026-11-01-ranked.sql. Safe to run again.
--
-- Before: a match needed a majority of its players to report the same standings,
-- so a 2-player game never counted if the loser quit before reporting.
--
-- Now every player's device records that it joined the match when the game
-- starts. A match also settles when:
--   * all reports agree,
--   * every player in the standings joined the match (so nobody can be added
--     to a game they never played),
--   * the players who didn't report all finished below the ones who did
--     (quitters drop to the bottom), and
--   * the first report is at least 5 seconds old, so an honest player still in
--     the game has time to report and block a false result.

create table if not exists public.ranked_entries (
  match_id text not null check (char_length(match_id) between 8 and 32),
  player uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (match_id, player)
);
alter table public.ranked_entries enable row level security;

-- Called by each device when a ranked game starts.
create or replace function public.ranked_join(p_match text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into ranked_entries (match_id, player) values (p_match, auth.uid()) on conflict do nothing;
end;
$$;

-- Applies Elo for a settled match. Internal: not callable by players.
create or replace function public.ranked_apply(p_match text, p_placements uuid[])
returns void
language plpgsql security definer set search_path = public as $$
declare
  n int := array_length(p_placements, 1);
  ratings int[];
  d int[];
  k float8;
  s float8;
  i int;
  j int;
  inserted int;
begin
  perform 1 from profiles where id = any (p_placements) for update;
  select array_agg(p.rating order by u.ord) into ratings
  from unnest(p_placements) with ordinality u (id, ord)
  join profiles p on p.id = u.id;

  -- Multiplayer Elo: each pair is a game, scaled so a full table moves
  -- about as much as a one-on-one.
  k := 32.0 / (n - 1);
  d := array_fill(0, array[n]);
  for i in 1..n loop
    s := 0;
    for j in 1..n loop
      if i <> j then
        s := s + (case when i < j then 1 else 0 end) - 1.0 / (1 + power(10, (ratings[j] - ratings[i]) / 400.0));
      end if;
    end loop;
    d[i] := round(k * s);
  end loop;

  insert into ranked_matches (match_id, placements, deltas)
  values (p_match, p_placements, d)
  on conflict do nothing;
  get diagnostics inserted = row_count;

  if inserted = 1 then
    update profiles p
    set rating = greatest(100, p.rating + d[u.ord]), ranked_games = p.ranked_games + 1
    from unnest(p_placements) with ordinality u (id, ord)
    where p.id = u.id;
  end if;
end;
$$;

-- Settles a match if its reports allow it. Internal: not callable by players.
create or replace function public.ranked_try_settle(p_match text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  best uuid[];
  agree int;
  n int;
  kinds int;
  reporters int;
  top_ok boolean;
  joined int;
  first_at timestamptz;
begin
  if exists (select 1 from ranked_matches m where m.match_id = p_match) then return; end if;

  -- Rule 1: a majority of the players agree.
  select r.placements, count(*) into best, agree
  from ranked_reports r
  where r.match_id = p_match and r.reporter = any (r.placements)
  group by r.placements
  order by count(*) desc
  limit 1;
  if best is null then return; end if;
  n := array_length(best, 1);
  if agree * 2 > n then
    perform ranked_apply(p_match, best);
    return;
  end if;

  -- Rule 2: everyone who reported agrees, and only people at the bottom are missing.
  select count(distinct r.placements), count(*), min(r.created_at) into kinds, reporters, first_at
  from ranked_reports r where r.match_id = p_match;
  if kinds <> 1 or first_at > now() - interval '5 seconds' then return; end if;

  -- Reporters must be exactly the top places.
  select bool_and(array_position(best, r.reporter) <= reporters) into top_ok
  from ranked_reports r where r.match_id = p_match;
  if not coalesce(top_ok, false) then return; end if;

  select count(*) into joined from ranked_entries e where e.match_id = p_match and e.player = any (best);
  if joined <> n then return; end if;

  perform ranked_apply(p_match, best);
end;
$$;

-- Report a finished match. p_placements: account ids, winner first.
-- Returns your current rating and, once the match is settled, your change.
create or replace function public.report_ranked(p_match text, p_placements uuid[])
returns table (rating int, delta int)
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  n int := coalesce(array_length(p_placements, 1), 0);
begin
  if me is null then raise exception 'not signed in'; end if;
  if n < 2 or n > 8 then raise exception 'bad match'; end if;
  if not (me = any (p_placements)) then raise exception 'not in this match'; end if;
  if (select count(distinct x) from unnest(p_placements) x) <> n then raise exception 'bad match'; end if;
  if (select count(*) from profiles where id = any (p_placements)) <> n then raise exception 'unknown player'; end if;

  insert into ranked_reports (match_id, reporter, placements)
  values (p_match, me, p_placements)
  on conflict do nothing;

  perform ranked_try_settle(p_match);

  return query
  select p.rating,
         (select m.deltas[array_position(m.placements, me)] from ranked_matches m where m.match_id = p_match)
  from profiles p
  where p.id = me;
end;
$$;

-- Settles your recent matches that are still waiting (e.g. you left the room
-- before the result was confirmed). Called when the ladder loads.
create or replace function public.settle_my_ranked()
returns void
language plpgsql security definer set search_path = public as $$
declare
  m text;
begin
  if auth.uid() is null then return; end if;
  for m in
    select r.match_id from ranked_reports r
    where r.reporter = auth.uid()
      and r.created_at > now() - interval '2 days'
      and not exists (select 1 from ranked_matches x where x.match_id = r.match_id)
  loop
    perform ranked_try_settle(m);
  end loop;
end;
$$;

revoke execute on function public.ranked_apply(text, uuid[]) from public, anon, authenticated;
revoke execute on function public.ranked_try_settle(text) from public, anon, authenticated;
grant execute on function public.ranked_join(text) to authenticated;
grant execute on function public.report_ranked(text, uuid[]) to authenticated;
grant execute on function public.settle_my_ranked() to authenticated;
