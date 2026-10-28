import type { RealtimeChannel } from '@supabase/supabase-js';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  MAX_PLAYERS,
  backToLobby,
  newLobby,
  rebaseClock,
  removePlayer,
  setLobbyPlayers,
  startGame,
  submitAnswer,
  tick,
  type TntState,
} from '@/game/tnt';
import { createStore } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

interface Member {
  id: string;
  name: string;
  joinedAt: number;
  buddy?: string;
}

export interface PublicRoom {
  code: string;
  count: number;
  phase: TntState['phase'];
  /** Host's display name. */
  host?: string;
}

const idStore = createStore<string>('party:player-id', '');

export function playerId() {
  let id = idStore.get();
  if (!id) {
    id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    idStore.set(id);
  }
  return id;
}

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export function newRoomCode() {
  let code = '';
  for (let i = 0; i < 4; i++) code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  return code;
}

const PUBLIC_CHANNEL = 'tnt:public';

/** Picks the fullest open public lobby from a room list. */
export function bestOpenRoom(rooms: PublicRoom[]) {
  return rooms.filter((r) => r.phase === 'lobby' && r.count < MAX_PLAYERS).sort((a, b) => b.count - a.count)[0] ?? null;
}

/**
 * Live list of public rooms. Only listens while the screen is focused: the
 * client shares one channel per topic, and a room we host advertises on the
 * same topic.
 */
export function usePublicRooms() {
  const [rooms, setRooms] = useState<PublicRoom[] | null>(supabase ? null : []);
  useFocusEffect(
    useCallback(() => {
      const sb = supabase;
      if (!sb) return;
      const ch = sb.channel(PUBLIC_CHANNEL, { config: { presence: { key: `seeker-${playerId()}` } } });
      ch.on('presence', { event: 'sync' }, () => {
        setRooms(
          Object.values(ch.presenceState<PublicRoom>())
            .flat()
            .filter((r) => r.code && r.count > 0)
            .sort((a, b) => Number(a.phase !== 'lobby') - Number(b.phase !== 'lobby') || b.count - a.count),
        );
      });
      ch.subscribe((s) => {
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setRooms([]);
      });
      return () => {
        sb.removeChannel(ch);
      };
    }, []),
  );
  return rooms;
}

export type RoomStatus = 'connecting' | 'live' | 'error';

export function useOnlineRoom(code: string, name: string, isPublic: boolean, buddy?: string) {
  const me = playerId();
  const [state, setState] = useState<TntState>(newLobby);
  const [members, setMembers] = useState<Member[]>([]);
  const [status, setStatus] = useState<RoomStatus>(supabase ? 'connecting' : 'error');
  const [offset, setOffset] = useState(0);

  const stateRef = useRef(state);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isHostRef = useRef(false);
  const [joinedAt] = useState(Date.now);

  const hostId = [...members].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))[0]?.id;
  const isHost = hostId === me;

  const publish = useCallback((s: TntState) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'state',
      payload: { state: s, hostNow: Date.now() },
    });
  }, []);

  const apply = useCallback(
    (next: TntState) => {
      if (next === stateRef.current) return;
      stateRef.current = next;
      setState(next);
      publish(next);
    },
    [publish],
  );

  // Join the room channel.
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    const ch = sb.channel(`tnt:${code}`, {
      config: { broadcast: { self: false }, presence: { key: me } },
    });
    channelRef.current = ch;

    ch.on('presence', { event: 'sync' }, () => {
      const list = Object.values(ch.presenceState<Member>())
        .map((metas) => metas[0])
        .filter((m): m is Member & { presence_ref: string } => Boolean(m?.id));
      setMembers(
        list
          .map(({ id, name: n, joinedAt: j, buddy: b }) => ({ id, name: n, joinedAt: j, buddy: b }))
          .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id)),
      );
    });
    ch.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (isHostRef.current) return;
      const incoming = payload.state as TntState;
      if (incoming.seq < stateRef.current.seq) return;
      stateRef.current = incoming;
      setState(incoming);
      setOffset((payload.hostNow as number) - Date.now());
    });
    ch.on('broadcast', { event: 'answer' }, ({ payload }) => {
      if (!isHostRef.current) return;
      apply(submitAnswer(stateRef.current, payload.playerId, payload.text, Date.now()));
    });
    ch.on('broadcast', { event: 'hello' }, () => {
      if (isHostRef.current) publish(stateRef.current);
    });
    ch.subscribe(async (s) => {
      if (s === 'SUBSCRIBED') {
        await ch.track({ id: me, name, joinedAt, buddy });
        setStatus('live');
        ch.send({ type: 'broadcast', event: 'hello', payload: {} });
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
        setStatus('error');
      }
    });

    return () => {
      channelRef.current = null;
      sb.removeChannel(ch);
    };
  }, [code, me, name, joinedAt, buddy, apply, publish]);

  // Host duties: keep the roster in sync with presence and run the fuse clock.
  useEffect(() => {
    const becameHost = isHost && !isHostRef.current;
    isHostRef.current = isHost;
    if (!isHost) return;

    let s = stateRef.current;
    if (becameHost) {
      setOffset(0);
      s = rebaseClock(s, Date.now());
    }
    if (s.phase === 'lobby') {
      s = setLobbyPlayers(s, members);
    } else {
      for (const p of s.players) {
        if (!members.some((m) => m.id === p.id)) s = removePlayer(s, p.id, Date.now());
      }
    }
    apply(s);

    const timer = setInterval(() => apply(tick(stateRef.current, Date.now(), Math.random)), 150);
    const heartbeat = setInterval(() => publish(stateRef.current), 2000);
    return () => {
      clearInterval(timer);
      clearInterval(heartbeat);
    };
  }, [isHost, members, apply, publish]);

  // Public rooms advertise themselves while in the lobby.
  const advertRef = useRef<{ ch: RealtimeChannel; ready: boolean } | null>(null);
  const advertLatest = useRef<PublicRoom>({ code, count: 0, phase: 'lobby', host: name });
  const count = state.players.length;
  const phase = state.phase;

  useEffect(() => {
    const sb = supabase;
    if (!sb || !isPublic || !isHost) return;
    const ch = sb.channel(PUBLIC_CHANNEL, { config: { presence: { key: code } } });
    const handle = { ch, ready: false };
    advertRef.current = handle;
    ch.subscribe(async (s) => {
      if (s === 'SUBSCRIBED') {
        handle.ready = true;
        await ch.track(advertLatest.current);
      }
    });
    return () => {
      advertRef.current = null;
      sb.removeChannel(ch);
    };
  }, [isPublic, isHost, code]);

  useEffect(() => {
    advertLatest.current = { code, count, phase, host: name };
    const handle = advertRef.current;
    if (handle?.ready) handle.ch.track(advertLatest.current);
  }, [code, count, phase, isHost, name]);

  const submit = useCallback(
    (text: string) => {
      if (isHostRef.current) {
        apply(submitAnswer(stateRef.current, me, text, Date.now()));
      } else {
        channelRef.current?.send({ type: 'broadcast', event: 'answer', payload: { playerId: me, text } });
      }
    },
    [apply, me],
  );

  const start = useCallback(() => {
    if (isHostRef.current) apply(startGame(stateRef.current, Date.now(), Math.random));
  }, [apply]);

  const playAgain = useCallback(() => {
    if (isHostRef.current) apply(setLobbyPlayers(backToLobby(stateRef.current), members));
  }, [apply, members]);

  return { me, state, members, isHost, status, offset, submit, start, playAgain };
}
