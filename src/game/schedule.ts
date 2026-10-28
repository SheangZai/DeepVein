import { PROMPTS } from '@/content';

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

export function promptsForDig(digNo: number): string[] {
  const ids = PROMPTS.map((p) => p.id).sort();
  const picked: string[] = [];
  for (let i = (digNo - 1) * PROMPTS_PER_DIG; picked.length < PROMPTS_PER_DIG; i++) {
    const id = sequenceAt(i, ids);
    if (!picked.includes(id)) picked.push(id);
  }
  return picked;
}

export function randomPrompts(exclude: string[] = []): string[] {
  const pool = PROMPTS.map((p) => p.id).filter((id) => !exclude.includes(id));
  const source = pool.length >= PROMPTS_PER_DIG ? pool : PROMPTS.map((p) => p.id);
  return shuffled(source, Math.random).slice(0, PROMPTS_PER_DIG);
}

export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
