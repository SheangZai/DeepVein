import { ensureSession } from './social';
import { createStore, useStore } from './storage';
import { supabase } from './supabase';

export type ReportReason = 'name' | 'cheating' | 'harassment' | 'other';

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'name', label: 'Offensive name' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'cheating', label: 'Cheating' },
  { id: 'other', label: 'Something else' },
];

export const BLOCKED_NAME = 'Blocked miner';

/**
 * Blocked players by account id, with the name they had when blocked (for the
 * unblock list). Kept on the device so blocks apply instantly and offline;
 * mirrored to the server so they survive reinstalls and end friendships.
 */
export const blockedStore = createStore<Record<string, string>>('moderation:blocked', {});

export function useBlocked() {
  return useStore(blockedStore);
}

/** The name to show for a player: hidden when you've blocked them. */
export function shownName(blocked: Record<string, string>, uid: string | undefined, name: string) {
  return uid && uid in blocked ? BLOCKED_NAME : name;
}

function client() {
  if (!supabase) throw new Error('Online features are not set up.');
  return supabase;
}

export async function blockPlayer(uid: string, name: string) {
  blockedStore.set((b) => ({ ...b, [uid]: name }));
  await ensureSession();
  const { error } = await client().rpc('block_player', { p_other: uid });
  if (error) throw error;
}

export async function unblockPlayer(uid: string) {
  blockedStore.set((b) => {
    const next = { ...b };
    delete next[uid];
    return next;
  });
  const me = await ensureSession();
  const { error } = await client().from('blocks').delete().eq('blocker', me).eq('blocked', uid);
  if (error) throw error;
}

export async function reportPlayer(uid: string, name: string, reason: ReportReason, context: string) {
  const me = await ensureSession();
  const { error } = await client()
    .from('player_reports')
    .upsert(
      { reporter: me, reported: uid, reason, reported_name: name.slice(0, 40), context: context.slice(0, 40) },
      { onConflict: 'reporter,reported,reason', ignoreDuplicates: true },
    );
  if (error) throw error;
}

/** Pulls blocks made on other devices. Local-only blocks are kept. */
export async function syncBlocks() {
  if (!supabase) return;
  try {
    const me = await ensureSession();
    const { data, error } = await client().from('blocks').select('blocked').eq('blocker', me);
    if (error) return;
    blockedStore.set((b) => {
      const next = { ...b };
      for (const row of data ?? []) {
        const id = row.blocked as string;
        if (!(id in next)) next[id] = BLOCKED_NAME;
      }
      return next;
    });
  } catch {
    // Offline: the local list still applies.
  }
}

/** Room state with blocked players' names hidden. Same object when nobody is blocked. */
export function maskBlocked<S extends { players: { uid?: string; name: string }[] }>(
  state: S,
  blocked: Record<string, string>,
): S {
  if (!state.players.some((p) => p.uid && p.uid in blocked)) return state;
  return { ...state, players: state.players.map((p) => (p.uid && p.uid in blocked ? { ...p, name: BLOCKED_NAME } : p)) };
}
