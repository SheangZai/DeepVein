export type TierId = 'miss' | 'dirt' | 'fools' | 'copper' | 'emerald' | 'ruby' | 'diamond';
export type AnswerTierId = Exclude<TierId, 'miss'>;

export interface Tier {
  id: TierId;
  name: string;
  points: number;
  emoji: string;
  color: string;
  blurb: string;
}

export const TIERS: Record<TierId, Tier> = {
  miss: {
    id: 'miss',
    name: 'Miss',
    points: 0,
    emoji: '⬛',
    color: '#5a4e44',
    blurb: 'Not on the list, or the fuse ran out.',
  },
  dirt: {
    id: 'dirt',
    name: 'Dirt',
    points: 10,
    emoji: '🟫',
    color: '#9a6a3c',
    blurb: 'The answer everyone digs up first.',
  },
  fools: {
    id: 'fools',
    name: "Fool's Gold",
    points: 15,
    emoji: '🟨',
    color: '#d9c45a',
    blurb: 'Looks rare. Turns out everyone thought of it.',
  },
  copper: {
    id: 'copper',
    name: 'Copper',
    points: 30,
    emoji: '🟧',
    color: '#e0823f',
    blurb: 'Solid ore. Plenty of miners hit this seam.',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    points: 60,
    emoji: '🟩',
    color: '#42c483',
    blurb: 'Genuinely uncommon. Nice strike.',
  },
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    points: 85,
    emoji: '🟥',
    color: '#e5485e',
    blurb: 'Deep obscurity. Few miners get this far.',
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    points: 100,
    emoji: '💎',
    color: '#82dcf7',
    blurb: 'The one hidden gem in this vein.',
  },
};

/** Shallowest to deepest; used for legends and sorting. */
export const TIER_ORDER: TierId[] = ['miss', 'dirt', 'fools', 'copper', 'emerald', 'ruby', 'diamond'];
export const ANSWER_TIERS: AnswerTierId[] = ['dirt', 'fools', 'copper', 'emerald', 'ruby', 'diamond'];

/** Fixed-length digs (shaft levels) and the seeded opening of each daily dig. */
export const PROMPTS_PER_DIG = 7;
export const SECONDS_PER_PROMPT = 25;
export const METERS_PER_POINT = 10;
/** Endless digs end after this many misses (wrong, passed or timed out). */
export const DIG_LIVES = 3;
/** Bottom of the drawn mine shaft; deeper digs pin to the bottom. */
export const SHAFT_DEPTH = 12_000;

export const DEPTH_ZONES = [
  { from: 0, name: 'Topsoil', color: '#6b4a2b' },
  { from: 500, name: 'Clay Beds', color: '#7a3f2a' },
  { from: 1500, name: 'Bedrock', color: '#4b4650' },
  { from: 3000, name: 'Crystal Caverns', color: '#2f4a6b' },
  { from: 4500, name: 'Magma Belt', color: '#8a2f1f' },
  { from: 6000, name: 'The Core', color: '#c9622a' },
  { from: 9000, name: 'The Abyss', color: '#3b2357' },
] as const;

export function depthFor(score: number) {
  return score * METERS_PER_POINT;
}

export function zoneFor(depth: number) {
  let zone: (typeof DEPTH_ZONES)[number] = DEPTH_ZONES[0];
  for (const z of DEPTH_ZONES) if (depth >= z.from) zone = z;
  return zone;
}

/** How a buddy is earned. Ores are answers that aren't misses; rare ores are Emerald or better. */
export type BuddyUnlock =
  | { kind: 'streak'; days: number }
  | { kind: 'ores'; count: number }
  | { kind: 'rare'; count: number }
  | { kind: 'luck' };

interface Buddy {
  id: string;
  name: string;
  emoji: string;
  unlock: BuddyUnlock;
}

export const BUDDIES = [
  { id: 'pip', name: 'Pip the Miner', emoji: '👷', unlock: { kind: 'streak', days: 0 } },
  { id: 'canary', name: 'Canary', emoji: '🐤', unlock: { kind: 'streak', days: 5 } },
  { id: 'bat', name: 'Cave Bat', emoji: '🦇', unlock: { kind: 'streak', days: 14 } },
  { id: 'golem', name: 'Stone Golem', emoji: '🗿', unlock: { kind: 'streak', days: 30 } },
  { id: 'dragon', name: 'Core Dragon', emoji: '🐉', unlock: { kind: 'streak', days: 45 } },
  { id: 'beaver', name: 'Burrow Beaver', emoji: '🦫', unlock: { kind: 'ores', count: 150 } },
  { id: 'drillbot', name: 'Drill Bot', emoji: '🤖', unlock: { kind: 'ores', count: 750 } },
  { id: 'scorpion', name: 'Emerald Scorpion', emoji: '🦂', unlock: { kind: 'rare', count: 40 } },
  { id: 'ghost', name: 'Mine Ghost', emoji: '👻', unlock: { kind: 'luck' } },
] as const satisfies readonly Buddy[];

export type BuddyId = (typeof BUDDIES)[number]['id'];
export type BuddyInfo = (typeof BUDDIES)[number];

/** Luck buddy odds per finished dig of 5+ answers; each dry dig adds a little. */
export const LUCK_MIN_ANSWERS = 5;
export const LUCK_BASE_CHANCE = 0.025;
export const LUCK_STEP_CHANCE = 0.0125;
