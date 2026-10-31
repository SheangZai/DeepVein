import { cleanName } from './names';
import type { AnswerRecord } from './progress';
import { supabase } from './supabase';

export interface Profile {
  id: string;
  display_name: string;
  friend_code: string;
}

export interface FriendResult {
  userId: string;
  name: string;
  score: number | null;
  grid: string | null;
  answers: AnswerRecord[];
}

function client() {
  if (!supabase) throw new Error('Online features are not set up.');
  return supabase;
}

/** Signs in anonymously on first use; returns the user id. */
export async function ensureSession(): Promise<string> {
  const sb = client();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signedIn, error } = await sb.auth.signInAnonymously();
  if (error || !signedIn.user) throw error ?? new Error('Sign-in failed');
  return signedIn.user.id;
}

export async function getProfile(): Promise<Profile> {
  const id = await ensureSession();
  const { data, error } = await client()
    .from('profiles')
    .select('id, display_name, friend_code')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateDisplayName(name: string) {
  const id = await ensureSession();
  const { error } = await client().from('profiles').update({ display_name: cleanName(name) }).eq('id', id);
  if (error) throw error;
}

export async function submitDaily(digNo: number, score: number, grid: string, answers: AnswerRecord[]) {
  const id = await ensureSession();
  const { error } = await client()
    .from('daily_results')
    .upsert(
      { user_id: id, dig_no: digNo, score, grid, answers },
      { onConflict: 'user_id,dig_no', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function getRank(digNo: number, score: number) {
  await ensureSession();
  const { data, error } = await client().rpc('dig_rank', { p_dig: digNo, p_score: score });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { deeper: number; total: number } | undefined;
  return row ?? { deeper: 0, total: 0 };
}

export async function addFriend(code: string) {
  await ensureSession();
  const { error } = await client().rpc('add_friend', { p_code: code });
  if (error) throw new Error(error.message);
}

/** Deletes the online account and everything tied to it, then signs out. */
export async function deleteAccount() {
  const sb = client();
  const { error } = await sb.rpc('delete_me');
  if (error) throw new Error(error.message);
  await sb.auth.signOut({ scope: 'local' });
}

export async function getFriendResults(digNo: number): Promise<FriendResult[]> {
  const id = await ensureSession();
  const sb = client();
  const { data: links, error } = await sb.from('friendships').select('friend_id').eq('user_id', id);
  if (error) throw error;
  const ids = (links ?? []).map((l) => l.friend_id as string);
  if (ids.length === 0) return [];

  const [{ data: profiles }, { data: results }] = await Promise.all([
    sb.from('profiles').select('id, display_name').in('id', ids),
    sb.from('daily_results').select('user_id, score, grid, answers').eq('dig_no', digNo).in('user_id', ids),
  ]);
  const byUser = new Map((results ?? []).map((r) => [r.user_id as string, r]));
  return (profiles ?? [])
    .map((p) => {
      const r = byUser.get(p.id);
      return {
        userId: p.id,
        name: cleanName(p.display_name),
        score: r?.score ?? null,
        grid: r?.grid ?? null,
        answers: (r?.answers as AnswerRecord[]) ?? [],
      };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}
