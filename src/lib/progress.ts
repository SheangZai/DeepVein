import { currentDigNo } from '@/game/schedule';
import { BUDDIES, TIERS, type BuddyId, type TierId } from '@/game/tiers';

import { cleanName } from './names';
import { createStore } from './storage';

export type DigMode = 'daily' | 'archive' | 'unlimited' | 'shaft';

export interface AnswerRecord {
  promptId: string;
  input: string;
  matched: string | null;
  tier: TierId;
  points: number;
}

export interface DigResult {
  mode: DigMode;
  digNo?: number;
  shaftId?: string;
  level?: number;
  answers: AnswerRecord[];
  score: number;
  finishedAt: number;
}

interface Progress {
  daily: Record<number, DigResult>;
  archive: Record<number, DigResult>;
  shafts: Record<string, DigResult>;
  lastDailyDig: number | null;
  streak: number;
  longestStreak: number;
  bestScore: number;
  gems: number;
  digsPlayed: number;
  unlimitedDay: number;
  unlimitedToday: number;
  recentUnlimited: string[];
  buddy: BuddyId;
  playerName: string;
}

const INITIAL: Progress = {
  daily: {},
  archive: {},
  shafts: {},
  lastDailyDig: null,
  streak: 0,
  longestStreak: 0,
  bestScore: 0,
  gems: 0,
  digsPlayed: 0,
  unlimitedDay: 0,
  unlimitedToday: 0,
  recentUnlimited: [],
  buddy: 'pip',
  playerName: '',
};

export const progressStore = createStore<Progress>('progress:v1', INITIAL);

export function shaftKey(shaftId: string, level: number) {
  return `${shaftId}:${level}`;
}

/** Streak as it should be displayed today (broken if yesterday was skipped). */
export function liveStreak(p: Progress, now = Date.now()) {
  if (p.lastDailyDig === null) return 0;
  return p.lastDailyDig >= currentDigNo(now) - 1 ? p.streak : 0;
}

export function unlimitedUsedToday(p: Progress, now = Date.now()) {
  return p.unlimitedDay === currentDigNo(now) ? p.unlimitedToday : 0;
}

export function recordResult(result: DigResult) {
  progressStore.set((p) => {
    const gems = result.answers.filter((a) => a.tier === 'diamond').length;
    const next: Progress = {
      ...p,
      bestScore: Math.max(p.bestScore, result.score),
      gems: p.gems + gems,
      digsPlayed: p.digsPlayed + 1,
    };
    if (result.mode === 'daily' && result.digNo !== undefined) {
      if (p.daily[result.digNo]) return p;
      next.daily = { ...p.daily, [result.digNo]: result };
      const continues = p.lastDailyDig === result.digNo - 1;
      next.streak = continues ? p.streak + 1 : 1;
      next.longestStreak = Math.max(p.longestStreak, next.streak);
      next.lastDailyDig = result.digNo;
    } else if (result.mode === 'archive' && result.digNo !== undefined) {
      next.archive = { ...p.archive, [result.digNo]: result };
    } else if (result.mode === 'shaft' && result.shaftId && result.level !== undefined) {
      next.shafts = { ...p.shafts, [shaftKey(result.shaftId, result.level)]: result };
    }
    return next;
  });
}

export function noteUnlimitedStarted(promptIds: string[]) {
  progressStore.set((p) => {
    const today = currentDigNo();
    const used = p.unlimitedDay === today ? p.unlimitedToday : 0;
    return {
      ...p,
      unlimitedDay: today,
      unlimitedToday: used + 1,
      recentUnlimited: [...promptIds, ...p.recentUnlimited].slice(0, 21),
    };
  });
}

export function setBuddy(buddy: BuddyId) {
  progressStore.set((p) => ({ ...p, buddy }));
}

export function setPlayerName(playerName: string) {
  progressStore.set((p) => ({ ...p, playerName: cleanName(playerName, '') }));
}

export function unlockedBuddies(p: Progress) {
  return BUDDIES.filter((b) => p.longestStreak >= b.streak);
}

export function buddyFor(p: Progress) {
  return BUDDIES.find((b) => b.id === p.buddy) ?? BUDDIES[0];
}

export function scoreOf(answers: AnswerRecord[]) {
  return answers.reduce((n, a) => n + a.points, 0);
}

/** Emoji grid of a dig; long digs are cut to `max` gems plus an ellipsis. */
export function gridOf(answers: AnswerRecord[], max = Infinity) {
  const grid = answers.slice(0, max).map((a) => TIERS[a.tier].emoji).join('');
  return answers.length > max ? `${grid}…` : grid;
}
