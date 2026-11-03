import { PROMPTS } from '@/content';
import { getShaft, type Shaft } from '@/content/shafts';

import { hashString, mulberry32, shuffled } from './rng';
import { PROMPTS_PER_DIG } from './tiers';

/** Dig #1 is this calendar day (in the reset time zone below). */
export const LAUNCH_DATE = { year: 2026, month: 10, day: 1 };
/** New dig at local midnight in this fixed UTC offset (8 = Malaysia/Singapore). */
export const RESET_UTC_OFFSET_HOURS = 8;

const DAY_MS = 86_400_000;
const OFFSET_MS = RESET_UTC_OFFSET_HOURS * 3_600_000;
const LAUNCH_DAY = Math.floor(Date.UTC(LAUNCH_DATE.year, LAUNCH_DATE.month - 1, LAUNCH_DATE.day) / DAY_MS);

function dayIndex(now: number) {
  return Math.floor((now + OFFSET_MS) / DAY_MS);
}

export function currentDigNo(now = Date.now()) {
  return dayIndex(now) - LAUNCH_DAY + 1;
}

/** Calendar date of a dig, e.g. "28 Oct 2026". */
export function digDateLabel(digNo: number) {
  const d = new Date((LAUNCH_DAY + digNo - 1) * DAY_MS);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function msUntilNextDig(now = Date.now()) {
  return (dayIndex(now) + 1) * DAY_MS - OFFSET_MS - now;
}

/**
 * The daily schedule walks through an endless chain of seeded shuffles of the
 * whole prompt pool, so every prompt is used once per cycle before repeating.
 */
function sequenceAt(i: number, ids: string[]) {
  const cycle = Math.floor(i / ids.length);
  const perm = shuffled(ids, mulberry32(hashString(`cycle:${cycle}`)));
  return perm[i % ids.length];
}

/** Prompts the daily dig may use on a given day, so adding prompts never changes past digs. */
function dailyPool(digNo: number) {
  return PROMPTS.filter((p) => p.since <= digNo)
    .map((p) => p.id)
    .sort();
}

export function promptsForDig(digNo: number): string[] {
  const ids = dailyPool(digNo);
  const picked: string[] = [];
  for (let i = (digNo - 1) * PROMPTS_PER_DIG; picked.length < PROMPTS_PER_DIG; i++) {
    const id = sequenceAt(i, ids);
    if (!picked.includes(id)) picked.push(id);
  }
  return picked;
}

/** How many times an endless dig cycles through the pool; nobody gets that far. */
const ENDLESS_CYCLES = 5;

/** Repeats a pool as back-to-back shuffles, never the same prompt twice in a row. */
function endlessFrom(first: string[], rand: () => number, all = PROMPTS.map((p) => p.id).sort()): string[] {
  const out = [...first];
  let pool = all.filter((id) => !first.includes(id));
  for (let c = 0; c < ENDLESS_CYCLES; c++) {
    const next = shuffled(pool, rand);
    if (next[0] === out[out.length - 1]) next.push(next.shift()!);
    out.push(...next);
    pool = all;
  }
  return out;
}

/** The daily dig: today's seeded opening, then the rest of the pool in a seeded order. */
export function endlessDailyPrompts(digNo: number): string[] {
  return endlessFrom(promptsForDig(digNo), mulberry32(hashString(`endless:${digNo}`)), dailyPool(digNo));
}

export function endlessRandomPrompts(exclude: string[] = []): string[] {
  return endlessFrom(randomPrompts(exclude), Math.random);
}

export function randomPrompts(exclude: string[] = []): string[] {
  const pool = PROMPTS.map((p) => p.id).filter((id) => !exclude.includes(id));
  const source = pool.length >= PROMPTS_PER_DIG ? pool : PROMPTS.map((p) => p.id);
  return shuffled(source, Math.random).slice(0, PROMPTS_PER_DIG);
}

// ---------- Topic of the Week ----------

/** Week #1 starts Monday 2 Nov 2026; weeks roll over at Monday midnight (reset time zone). */
const WEEK1_DAY = Math.floor(Date.UTC(2026, 10, 2) / DAY_MS);
const WEEKLY_ROTATION = ['everyday', 'food', 'screen', 'sports', 'geography', 'nature', 'science', 'words'];

export function currentWeekNo(now = Date.now()) {
  return Math.floor((dayIndex(now) - WEEK1_DAY) / 7) + 1;
}

export function msUntilNextWeek(now = Date.now()) {
  return (WEEK1_DAY + currentWeekNo(now) * 7) * DAY_MS - OFFSET_MS - now;
}

/** e.g. "2–8 Nov" */
export function weekRangeLabel(weekNo: number) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const start = new Date((WEEK1_DAY + (weekNo - 1) * 7) * DAY_MS);
  const end = new Date((WEEK1_DAY + (weekNo - 1) * 7 + 6) * DAY_MS);
  const s = `${start.getUTCDate()}${start.getUTCMonth() === end.getUTCMonth() ? '' : ` ${months[start.getUTCMonth()]}`}`;
  return `${s}–${end.getUTCDate()} ${months[end.getUTCMonth()]}`;
}

export function weeklyTopic(weekNo: number): Shaft {
  return getShaft(WEEKLY_ROTATION[(weekNo - 1) % WEEKLY_ROTATION.length])!;
}

/** The week's challenge: every prompt of its topic in a seeded order, cycling, never one twice in a row. */
export function weeklyPrompts(weekNo: number): string[] {
  const pool = weeklyTopic(weekNo).levels.flatMap((l) => l.prompts);
  const rand = mulberry32(hashString(`week:${weekNo}`));
  const out: string[] = [];
  for (let c = 0; c < 8; c++) {
    const next = shuffled(pool, rand);
    if (next[0] === out[out.length - 1]) next.push(next.shift()!);
    out.push(...next);
  }
  return out;
}

export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
