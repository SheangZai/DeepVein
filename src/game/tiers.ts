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

export const PROMPTS_PER_DIG = 7;
export const SECONDS_PER_PROMPT = 25;
export const METERS_PER_POINT = 10;
export const MAX_SCORE = PROMPTS_PER_DIG * TIERS.diamond.points;
export const MAX_DEPTH = MAX_SCORE * METERS_PER_POINT;

export const DEPTH_ZONES = [
  { from: 0, name: 'Topsoil', color: '#6b4a2b' },
  { from: 500, name: 'Clay Beds', color: '#7a3f2a' },
  { from: 1500, name: 'Bedrock', color: '#4b4650' },
  { from: 3000, name: 'Crystal Caverns', color: '#2f4a6b' },
  { from: 4500, name: 'Magma Belt', color: '#8a2f1f' },
  { from: 6000, name: 'The Core', color: '#c9622a' },
] as const;

export function depthFor(score: number) {
  return score * METERS_PER_POINT;
}

export function zoneFor(depth: number) {
  let zone: (typeof DEPTH_ZONES)[number] = DEPTH_ZONES[0];
  for (const z of DEPTH_ZONES) if (depth >= z.from) zone = z;
  return zone;
}

export const BUDDIES = [
  { id: 'pip', name: 'Pip the Miner', emoji: '👷', streak: 0 },
  { id: 'canary', name: 'Canary', emoji: '🐤', streak: 5 },
  { id: 'bat', name: 'Cave Bat', emoji: '🦇', streak: 14 },
  { id: 'golem', name: 'Stone Golem', emoji: '🗿', streak: 30 },
  { id: 'dragon', name: 'Core Dragon', emoji: '🐉', streak: 45 },
] as const;

export type BuddyId = (typeof BUDDIES)[number]['id'];
