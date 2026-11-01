import { useEffect, useState } from 'react';

import { rankedPlacements, type TntState } from '@/game/tnt';
import { joinRanked, reportRanked } from '@/lib/social';

export interface RankedResult {
  rating: number | null;
  delta: number | null;
  /** 'waiting' until the server confirms the result. */
  status: 'unranked' | 'waiting' | 'done' | 'error';
}

const RETRY_MS = 1500;
const MAX_TRIES = 10;

/**
 * Ranked play for one device: records that you joined when a game starts, then
 * reports the final standings and polls until the server settles the result.
 * Polling carries on after the room returns to the lobby.
 */
export function useRankedResult(state: TntState, ranked: boolean, myId: string): RankedResult {
  const me = state.players.find((p) => p.id === myId);
  const inGame = !!me;

  // Tell the server you're in this match as soon as it starts.
  const joinId = ranked && state.phase === 'playing' && me?.uid ? state.matchId : '';
  useEffect(() => {
    if (joinId) joinRanked(joinId).catch(() => {});
  }, [joinId]);

  const placements = ranked ? rankedPlacements(state) : null;
  const matchId = placements && inGame ? state.matchId : '';
  const order = placements?.join(',') ?? '';

  // The last finished match to report; kept after the room moves on.
  const [pending, setPending] = useState<{ matchId: string; order: string } | null>(null);
  if (matchId && order && pending?.matchId !== matchId) setPending({ matchId, order });

  // Server replies, tagged with the match they belong to.
  const [reply, setReply] = useState<(RankedResult & { matchId: string }) | null>(null);

  useEffect(() => {
    if (!pending) return;
    const { matchId: id, order: list } = pending;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const attempt = async (tries: number) => {
      try {
        const r = await reportRanked(id, list.split(','));
        if (cancelled) return;
        if (r.delta !== null) {
          setReply({ matchId: id, rating: r.rating, delta: r.delta, status: 'done' });
        } else if (tries + 1 < MAX_TRIES) {
          timer = setTimeout(() => attempt(tries + 1), RETRY_MS);
        } else {
          setReply({ matchId: id, rating: r.rating, delta: null, status: 'error' });
        }
      } catch {
        if (!cancelled) setReply({ matchId: id, rating: null, delta: null, status: 'error' });
      }
    };
    attempt(0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pending]);

  if (!matchId) return { rating: null, delta: null, status: 'unranked' };
  if (reply?.matchId !== matchId) return { rating: null, delta: null, status: 'waiting' };
  return reply;
}
