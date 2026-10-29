-- Endless daily digs: scores are no longer capped at 7 prompts × 100.
-- Paste into Supabase → SQL Editor and run once. Safe to run again.
alter table public.daily_results drop constraint if exists daily_results_score_check;
alter table public.daily_results add constraint daily_results_score_check check (score between 0 and 100000);
