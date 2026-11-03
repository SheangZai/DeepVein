import { currentDigNo } from '@/game/schedule';
import {
  BUDDIES,
  LUCK_BASE_CHANCE,
  LUCK_MIN_ANSWERS,
  LUCK_STEP_CHANCE,
  TIERS,
  type BuddyId,
  type BuddyInfo,
  type TierId,
} from '@/game/tiers';

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
  /** Lifetime ores (non-miss answers). Missing on older saves: counted from stored digs. */
  ores?: number;
  /** Lifetime Emerald-or-better answers, same backfill rule. */
  rareOres?: number;
  /** Buddies found by luck. */
  found?: BuddyId[];
  /** Finished digs since the last luck roll came up empty, raising the odds. */
  dryDigs?: number;
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

/** v2: levels were rebuilt with their own questions, so old level results don't carry over. */
export function shaftKey(shaftId: string, level: number) {
  return `${shaftId}:v2:${level}`;
}

/** Streak as it should be displayed today (broken if yesterday was skipped). */
export function liveStreak(p: Progress, now = Date.now()) {
  if (p.lastDailyDig === null) return 0;
  return p.lastDailyDig >= currentDigNo(now) - 1 ? p.streak : 0;
}

export function unlimitedUsedToday(p: Progress, now = Date.now()) {
  return p.unlimitedDay === currentDigNo(now) ? p.unlimitedToday : 0;
}

const RARE: TierId[] = ['emerald', 'ruby', 'diamond'];

function countOres(answers: AnswerRecord[]) {
  return {
    ores: answers.filter((a) => a.tier !== 'miss').length,
    rare: answers.filter((a) => RARE.includes(a.tier)).length,
  };
}

/** Lifetime ore totals; older saves start from the digs they still have stored. */
export function oreTotals(p: Progress) {
  if (p.ores !== undefined && p.rareOres !== undefined) return { ores: p.ores, rare: p.rareOres };
  let ores = 0;
  let rare = 0;
  for (const r of [...Object.values(p.daily), ...Object.values(p.archive), ...Object.values(p.shafts)]) {
    const c = countOres(r.answers);
    ores += c.ores;
    rare += c.rare;
  }
  return { ores: p.ores ?? ores, rare: p.rareOres ?? rare };
}

export function isUnlocked(p: Progress, b: BuddyInfo) {
  const u = b.unlock;
  if (u.kind === 'streak') return p.longestStreak >= u.days;
  if (u.kind === 'luck') return (p.found ?? []).includes(b.id);
  const t = oreTotals(p);
  return (u.kind === 'ores' ? t.ores : t.rare) >= u.count;
}

/** How to get a buddy, e.g. "14-day streak", "92 / 150 ores". */
export function unlockHint(p: Progress, b: BuddyInfo, { short = false } = {}) {
  const u = b.unlock;
  if (u.kind === 'streak') return short ? `${u.days}-day` : `${u.days}-day streak`;
  if (u.kind === 'luck') return short ? '???' : 'Found by luck while digging';
  const t = oreTotals(p);
  const have = Math.min(u.count, u.kind === 'ores' ? t.ores : t.rare);
  if (short) return `${have}/${u.count}`;
  return u.kind === 'ores' ? `${have} / ${u.count} ores` : `${have} / ${u.count} emeralds or better`;
}

/** Records a finished dig and returns any buddies it unlocked. */
export type BuddyFoundList = BuddyInfo[];

export function recordResult(result: DigResult): BuddyFoundList {
  const before = new Set(unlockedBuddies(progressStore.get()).map((b) => b.id));
  progressStore.set((p) => {
    const gems = result.answers.filter((a) => a.tier === 'diamond').length;
    const totals = oreTotals(p);
    const dug = countOres(result.answers);
    const found = p.found ?? [];
    let dryDigs = p.dryDigs ?? 0;
    let lucky: BuddyId[] = [];
    const luckBuddy = BUDDIES.find((b) => b.unlock.kind === 'luck' && !found.includes(b.id));
    if (luckBuddy && result.answers.length >= LUCK_MIN_ANSWERS) {
      if (Math.random() < Math.min(1, LUCK_BASE_CHANCE + LUCK_STEP_CHANCE * dryDigs)) {
        lucky = [luckBuddy.id];
        dryDigs = 0;
      } else {
        dryDigs += 1;
      }
    }
    const next: Progress = {
      ...p,
      bestScore: Math.max(p.bestScore, result.score),
      gems: p.gems + gems,
      digsPlayed: p.digsPlayed + 1,
      ores: totals.ores + dug.ores,
      rareOres: totals.rare + dug.rare,
      found: [...found, ...lucky],
      dryDigs,
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
  return unlockedBuddies(progressStore.get()).filter((b) => !before.has(b.id));
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
  return BUDDIES.filter((b) => isUnlocked(p, b));
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
