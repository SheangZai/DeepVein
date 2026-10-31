import { useEffect, useState } from 'react';

import { rankedPlacements, type TntState } from '@/game/tnt';
import { reportRanked } from '@/lib/social';

export interface RankedResult {
  rating: number | null;
  delta: number | null;
  /** 'waiting' until enough players have reported the same result. */
  status: 'unranked' | 'waiting' | 'done' | 'error';
}

const RETRY_MS = 2000;
const MAX_TRIES = 5;

/**
 * Reports a finished ranked game once and polls until the server settles it
 * (a majority of the table has to report the same standings).
 */
export function useRankedResult(state: TntState, ranked: boolean, myId: string): RankedResult {
  const placements = ranked ? rankedPlacements(state) : null;
  const inGame = state.players.some((p) => p.id === myId);
  const matchId = placements && inGame ? state.matchId : '';
  const order = placements?.join(',') ?? '';
  // Server replies, tagged with the match they belong to.
  const [reply, setReply] = useState<(RankedResult & { matchId: string }) | null>(null);

  useEffect(() => {
    if (!matchId || !order) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const attempt = async (tries: number) => {
      try {
        const r = await reportRanked(matchId, order.split(','));
        if (cancelled) return;
        if (r.delta !== null) {
          setReply({ matchId, rating: r.rating, delta: r.delta, status: 'done' });
        } else if (tries + 1 < MAX_TRIES) {
          timer = setTimeout(() => attempt(tries + 1), RETRY_MS);
        } else {
          setReply({ matchId, rating: r.rating, delta: null, status: 'error' });
        }
      } catch {
        if (!cancelled) setReply({ matchId, rating: null, delta: null, status: 'error' });
      }
    };
    attempt(0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [matchId, order]);

  if (!matchId) return { rating: null, delta: null, status: 'unranked' };
  if (reply?.matchId !== matchId) return { rating: null, delta: null, status: 'waiting' };
  return reply;
}
