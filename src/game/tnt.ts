/**
 * TNT Toss: players take turns naming answers for a shared category. A valid,
 * unused answer passes the lit TNT along; a wrong one can be retried while the
 * fuse burns. The fuse starts long and gets shorter with every pass for the
 * whole game, down to a floor. If it burns out on you, you lose a heart and a
 * new category starts. Last miner standing wins.
 *
 * Pure state transitions: the host device (or the single device in
 * pass-and-play) owns the state and calls these; everyone else renders it.
 */
import { matchAnswer } from '@/content/build';
import { PROMPTS, getPrompt } from '@/content';
import { cleanName } from '@/lib/names';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const START_HEARTS = 3;
export const START_FUSE_MS = 25_000;
export const MIN_FUSE_MS = 8_000;
/** Each pass keeps this share of the fuse: 25s → 8s takes about 14 passes. */
export const FUSE_DECAY = 0.92;
export const BOOM_PAUSE_MS = 2_500;
/** Public lobbies start on their own once enough miners are in. */
export const LOBBY_COUNTDOWN_MS = 15_000;
/** A full lobby has no one left to wait for. */
export const FULL_COUNTDOWN_MS = 5_000;
/** Public tables return to the lobby this long after a game ends. */
export const RESULTS_PAUSE_MS = 8_000;

/** Categories need enough answers that a full table can keep passing. */
export const TNT_PROMPT_IDS = PROMPTS.filter((p) => p.entries.length >= 20).map((p) => p.id);

export interface TntPlayer {
  id: string;
  name: string;
  hearts: number;
  alive: boolean;
  /** Streak buddy id shown on the player's ledge. */
  buddy?: string;
  /** Signed-in account id, needed for ranked play. */
  uid?: string;
}

export type TntEvent =
  | { kind: 'pass'; playerId: string; answer: string }
  /**
   * `text` is the matched answer for a repeat, and empty for an answer that
   * doesn't fit: free text typed by one player is never shown to others.
   */
  | { kind: 'reject'; playerId: string; text: string; reason: 'unknown' | 'used' }
  | { kind: 'boom'; playerId: string }
  | { kind: 'left'; playerId: string };

export interface TntState {
  phase: 'lobby' | 'playing' | 'boom' | 'over';
  players: TntPlayer[];
  turn: string | null;
  promptId: string | null;
  used: string[];
  usedIds: string[];
  fuseMs: number;
  /** Timestamps are in the clock of whichever device owns the state. */
  fuseEndsAt: number;
  /** End of the boom pause, or (in 'over') when a public table returns to the lobby. */
  resumeAt: number;
  /** Public lobby countdown; 0 when not counting down. */
  startsAt: number;
  seenPrompts: string[];
  lastEvent: TntEvent | null;
  winner: string | null;
  /** Fresh id per game, so ranked results can't be reported twice. */
  matchId: string;
  /** Player ids in the order they were knocked out. */
  out: string[];
  seq: number;
}

export function newLobby(): TntState {
  return {
    phase: 'lobby',
    players: [],
    turn: null,
    promptId: null,
    used: [],
    usedIds: [],
    fuseMs: START_FUSE_MS,
    fuseEndsAt: 0,
    resumeAt: 0,
    startsAt: 0,
    seenPrompts: [],
    lastEvent: null,
    winner: null,
    matchId: '',
    out: [],
    seq: 0,
  };
}

function bump(s: TntState, patch: Partial<TntState>): TntState {
  return { ...s, ...patch, seq: s.seq + 1 };
}

function alive(s: TntState) {
  return s.players.filter((p) => p.alive);
}

function nextAliveAfter(s: TntState, id: string | null): string | null {
  const n = s.players.length;
  if (n === 0) return null;
  const start = Math.max(0, s.players.findIndex((p) => p.id === id));
  for (let step = 1; step <= n; step++) {
    const p = s.players[(start + step) % n];
    if (p.alive) return p.id;
  }
  return null;
}

function pickPrompt(seen: string[], rand: () => number) {
  const fresh = TNT_PROMPT_IDS.filter((id) => !seen.includes(id));
  const pool = fresh.length ? fresh : TNT_PROMPT_IDS;
  return pool[Math.floor(rand() * pool.length)];
}

/** New category. The fuse keeps the speed it had reached; only a new game resets it. */
function startRound(s: TntState, firstTurn: string | null, now: number, rand: () => number): TntState {
  const promptId = pickPrompt(s.seenPrompts, rand);
  return bump(s, {
    phase: 'playing',
    promptId,
    seenPrompts: [...s.seenPrompts, promptId],
    used: [],
    usedIds: [],
    fuseEndsAt: now + s.fuseMs,
    turn: firstTurn,
  });
}

export function setLobbyPlayers(
  s: TntState,
  players: { id: string; name: string; buddy?: string; uid?: string }[],
): TntState {
  if (s.phase !== 'lobby') return s;
  const next = players.slice(0, MAX_PLAYERS).map((p) => ({
    id: p.id,
    // Names come from other devices; the state owner cleans them for everyone.
    name: cleanName(p.name),
    hearts: START_HEARTS,
    alive: true,
    buddy: p.buddy,
    uid: p.uid,
  }));
  const same =
    next.length === s.players.length &&
    next.every(
      (p, i) =>
        p.id === s.players[i].id && p.name === s.players[i].name && p.buddy === s.players[i].buddy && p.uid === s.players[i].uid,
    );
  return same ? s : bump(s, { players: next });
}

export function startGame(s: TntState, now: number, rand: () => number): TntState {
  if (s.players.length < MIN_PLAYERS) return s;
  const players = s.players.map((p) => ({ ...p, hearts: START_HEARTS, alive: true }));
  const first = players[Math.floor(rand() * players.length)].id;
  const matchId = now.toString(36) + Math.floor(rand() * 36 ** 6).toString(36);
  const reset = { ...newLobby(), players, matchId, seq: s.seq };
  return startRound(reset, first, now, rand);
}

export function submitAnswer(s: TntState, playerId: string, text: string, now: number): TntState {
  if (s.phase !== 'playing' || s.turn !== playerId || !s.promptId) return s;
  const entry = matchAnswer(getPrompt(s.promptId), text);
  if (!entry) {
    return bump(s, { lastEvent: { kind: 'reject', playerId, text: '', reason: 'unknown' } });
  }
  if (s.usedIds.includes(entry.id)) {
    return bump(s, { lastEvent: { kind: 'reject', playerId, text: entry.name, reason: 'used' } });
  }
  const fuseMs = Math.max(MIN_FUSE_MS, Math.round(s.fuseMs * FUSE_DECAY));
  return bump(s, {
    used: [entry.name, ...s.used],
    usedIds: [...s.usedIds, entry.id],
    turn: nextAliveAfter(s, playerId),
    fuseMs,
    fuseEndsAt: now + fuseMs,
    lastEvent: { kind: 'pass', playerId, answer: entry.name },
  });
}

function finishIfDecided(s: TntState, now: number): TntState | null {
  const left = alive(s);
  if (left.length <= 1 && s.phase !== 'lobby') {
    return bump(s, { phase: 'over', turn: null, winner: left[0]?.id ?? null, resumeAt: now + RESULTS_PAUSE_MS });
  }
  return null;
}

/** Advance timers. Returns the same object when nothing changed. */
export function tick(s: TntState, now: number, rand: () => number): TntState {
  if (s.phase === 'playing' && s.turn && now >= s.fuseEndsAt) {
    const victim = s.turn;
    const players = s.players.map((p) =>
      p.id === victim ? { ...p, hearts: p.hearts - 1, alive: p.hearts - 1 > 0 } : p,
    );
    const knockedOut = !players.find((p) => p.id === victim)!.alive;
    const boomed = bump(s, {
      players,
      out: knockedOut ? [...s.out, victim] : s.out,
      phase: 'boom',
      resumeAt: now + BOOM_PAUSE_MS,
      lastEvent: { kind: 'boom', playerId: victim },
    });
    return finishIfDecided(boomed, now) ?? boomed;
  }
  if (s.phase === 'boom' && now >= s.resumeAt) {
    const victim = s.lastEvent?.kind === 'boom' ? s.lastEvent.playerId : s.turn;
    const victimAlive = s.players.find((p) => p.id === victim)?.alive;
    const first = victimAlive ? victim : nextAliveAfter(s, victim);
    return startRound(s, first, now, rand);
  }
  return s;
}

/** A player disconnected or quit. */
export function removePlayer(s: TntState, playerId: string, now: number): TntState {
  if (!s.players.some((p) => p.id === playerId)) return s;
  if (s.phase === 'lobby') {
    return bump(s, { players: s.players.filter((p) => p.id !== playerId) });
  }
  if (s.phase === 'over') return s;
  const wasAlive = s.players.find((p) => p.id === playerId)!.alive;
  const players = s.players.map((p) => (p.id === playerId ? { ...p, alive: false, hearts: 0 } : p));
  let next = bump(s, {
    players,
    out: wasAlive ? [...s.out, playerId] : s.out,
    lastEvent: { kind: 'left', playerId },
  });
  const decided = finishIfDecided(next, now);
  if (decided) return decided;
  if (s.turn === playerId) {
    next = bump(next, { turn: nextAliveAfter(next, playerId), fuseEndsAt: now + next.fuseMs });
  }
  return next;
}

/** Used when a new host takes over: restart the current fuse on its own clock. */
export function rebaseClock(s: TntState, now: number): TntState {
  if (s.phase === 'playing') return bump(s, { fuseEndsAt: now + s.fuseMs });
  if (s.phase === 'boom') return bump(s, { resumeAt: now + BOOM_PAUSE_MS });
  if (s.phase === 'over') return bump(s, { resumeAt: now + RESULTS_PAUSE_MS });
  if (s.phase === 'lobby' && s.startsAt) return bump(s, { startsAt: now + LOBBY_COUNTDOWN_MS });
  return s;
}

/**
 * Public rooms run themselves: the lobby counts down once enough miners are
 * in (shorter when full), and a finished game returns to the lobby. The
 * caller refills the lobby roster after a return. Same object when unchanged.
 */
export function autoTick(s: TntState, now: number, rand: () => number): TntState {
  if (s.phase === 'lobby') {
    const n = s.players.length;
    if (n < MIN_PLAYERS) return s.startsAt ? bump(s, { startsAt: 0 }) : s;
    if (!s.startsAt) return bump(s, { startsAt: now + LOBBY_COUNTDOWN_MS });
    if (n >= MAX_PLAYERS && s.startsAt - now > FULL_COUNTDOWN_MS) return bump(s, { startsAt: now + FULL_COUNTDOWN_MS });
    if (now >= s.startsAt) return startGame(s, now, rand);
    return s;
  }
  if (s.phase === 'over' && now >= s.resumeAt) return backToLobby(s);
  return s;
}

export function backToLobby(s: TntState): TntState {
  return {
    ...newLobby(),
    players: s.players.map((p) => ({ ...p, hearts: START_HEARTS, alive: true })),
    seq: s.seq + 1,
  };
}

/**
 * Final standings as account ids, best first: the winner, then everyone in
 * reverse knockout order. Null when the game can't be ranked (not over, or a
 * player isn't signed in).
 */
export function rankedPlacements(s: TntState): string[] | null {
  if (s.phase !== 'over' || !s.matchId || s.players.length < MIN_PLAYERS) return null;
  const order = [...(s.winner ? [s.winner] : []), ...[...s.out].reverse()];
  const seen = new Set(order);
  // Anyone missing from the knockout list (shouldn't happen) goes last.
  for (const p of s.players) if (!seen.has(p.id)) order.push(p.id);
  const uids = order.map((id) => s.players.find((p) => p.id === id)?.uid);
  if (uids.some((u) => !u) || new Set(uids).size !== uids.length) return null;
  return uids as string[];
}
