-- Ranked TNT Toss (Elo). Paste into Supabase → SQL Editor and run once. Safe to run again.
--
-- Public TNT rooms are ranked. When a game ends, every player's device reports
-- the final standings. Ratings change only once a majority of the players in
-- that match have reported the same standings, so one player can't invent a
-- result. Players can't write their own rating.

alter table public.profiles add column if not exists rating int not null default 1000;
alter table public.profiles add column if not exists ranked_games int not null default 0;

-- Players may change their display name, nothing else on their profile.
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

create table if not exists public.ranked_reports (
  match_id text not null check (char_length(match_id) between 8 and 32),
  reporter uuid not null references public.profiles (id) on delete cascade,
  placements uuid[] not null,
  created_at timestamptz not null default now(),
  primary key (match_id, reporter)
);

create table if not exists public.ranked_matches (
  match_id text primary key,
  placements uuid[] not null,
  deltas int[] not null,
  created_at timestamptz not null default now()
);

-- No direct access: everything goes through the functions below.
alter table public.ranked_reports enable row level security;
alter table public.ranked_matches enable row level security;

create index if not exists profiles_rating_idx on public.profiles (rating desc) where ranked_games > 0;

-- Report a finished match. p_placements: account ids, winner first.
-- Returns your current rating and, once the match is settled, your change.
create or replace function public.report_ranked(p_match text, p_placements uuid[])
returns table (rating int, delta int)
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  n int := coalesce(array_length(p_placements, 1), 0);
  agree int;
  ratings int[];
  d int[];
  k float8;
  s float8;
  i int;
  j int;
  inserted int;
begin
  if me is null then raise exception 'not signed in'; end if;
  if n < 2 or n > 8 then raise exception 'bad match'; end if;
  if not (me = any (p_placements)) then raise exception 'not in this match'; end if;
  if (select count(distinct x) from unnest(p_placements) x) <> n then raise exception 'bad match'; end if;
  if (select count(*) from profiles where id = any (p_placements)) <> n then raise exception 'unknown player'; end if;

  insert into ranked_reports (match_id, reporter, placements)
  values (p_match, me, p_placements)
  on conflict do nothing;

  if not exists (select 1 from ranked_matches m where m.match_id = p_match) then
    select count(*) into agree
    from ranked_reports r
    where r.match_id = p_match and r.placements = p_placements and r.reporter = any (p_placements);

    if agree * 2 > n then
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
    end if;
  end if;

  return query
  select p.rating,
         (select m.deltas[array_position(m.placements, me)] from ranked_matches m where m.match_id = p_match)
  from profiles p
  where p.id = me;
end;
$$;

-- Top ranked miners.
create or replace function public.ranked_top(p_limit int default 20)
returns table (id uuid, display_name text, rating int, ranked_games int)
language sql stable security definer set search_path = public as $$
  select id, display_name, rating, ranked_games
  from profiles
  where ranked_games > 0
  order by rating desc, ranked_games desc
  limit least(greatest(p_limit, 1), 50);
$$;

grant execute on function public.report_ranked(text, uuid[]) to authenticated;
grant execute on function public.ranked_top(int) to authenticated;
