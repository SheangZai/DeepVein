import { hashString, mulberry32, shuffled } from '@/game/rng';

import { promptsInCategory, type CategoryId } from './index';

/** Themed packs of prompts, played level by level. */
export interface Shaft {
  id: string;
  category: CategoryId;
  title: string;
  emoji: string;
  blurb: string;
  levels: number;
}

export const PROMPTS_PER_LEVEL = 5;

export const SHAFTS: Shaft[] = [
  {
    id: 'geography',
    category: 'geography',
    title: 'Atlas Shaft',
    emoji: '🗺️',
    blurb: 'Countries, capitals and the places nobody remembers.',
    levels: 3,
  },
  {
    id: 'science',
    category: 'science',
    title: 'Lab Shaft',
    emoji: '🧪',
    blurb: 'Elements, bones, moons and clouds.',
    levels: 3,
  },
  {
    id: 'sports',
    category: 'sports',
    title: 'Stadium Shaft',
    emoji: '🏟️',
    blurb: 'Teams, champions and host cities.',
    levels: 3,
  },
  {
    id: 'screen',
    category: 'screen',
    title: 'Cinema Shaft',
    emoji: '🎬',
    blurb: 'Films, Bonds, princesses and Beatles.',
    levels: 3,
  },
];

export function getShaft(id: string): Shaft | undefined {
  return SHAFTS.find((s) => s.id === id);
}

/** Deterministic prompt list for one level of a shaft. */
export function shaftLevelPrompts(shaft: Shaft, level: number): string[] {
  const pool = promptsInCategory(shaft.category).map((p) => p.id);
  const rand = mulberry32(hashString(`${shaft.id}:${level}`));
  return shuffled(pool, rand).slice(0, Math.min(PROMPTS_PER_LEVEL, pool.length));
}
