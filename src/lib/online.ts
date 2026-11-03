import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { playerId } from '@/hooks/use-online-room';

import { supabase } from './supabase';

/**
 * "Miners online now": every open copy of the app joins one presence channel
 * while it's in the foreground. Keyed by device, so two tabs count once.
 * Uses the same realtime connection as TNT rooms; no sign-in needed.
 */
const CHANNEL = 'deepvein:online';

let count: number | null = null;
const listeners = new Set<() => void>();
function set(n: number | null) {
  count = n;
  listeners.forEach((l) => l());
}

export function startPresence() {
  const sb = supabase;
  if (!sb) return () => {};
  let ch: RealtimeChannel | null = null;

  const join = () => {
    if (ch) return;
    const channel = sb.channel(CHANNEL, { config: { presence: { key: playerId() } } });
    channel.on('presence', { event: 'sync' }, () => set(Object.keys(channel.presenceState()).length));
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ at: Date.now() });
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') set(null);
    });
    ch = channel;
  };
  const leave = () => {
    if (!ch) return;
    sb.removeChannel(ch);
    ch = null;
    set(null);
  };

  join();
  const sub = AppState.addEventListener('change', (s) => (s === 'active' ? join() : leave()));
  return () => {
    sub.remove();
    leave();
  };
}

/** Miners with the app open right now (including you), or null while unknown. */
export function useOnlineCount() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => count,
    () => count,
  );
}
