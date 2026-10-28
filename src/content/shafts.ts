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
    blurb: 'Countries, capitals, rivers and the places nobody remembers.',
    levels: 6,
  },
  {
    id: 'science',
    category: 'science',
    title: 'Lab Shaft',
    emoji: '🧪',
    blurb: 'Elements, bones, moons, stars and vitamins.',
    levels: 5,
  },
  {
    id: 'sports',
    category: 'sports',
    title: 'Stadium Shaft',
    emoji: '🏟️',
    blurb: 'Teams, champions, host cities and martial arts.',
    levels: 4,
  },
  {
    id: 'screen',
    category: 'screen',
    title: 'Cinema Shaft',
    emoji: '🎬',
    blurb: 'Films, Pokémon, Beatles and instruments.',
    levels: 5,
  },
  {
    id: 'food',
    category: 'food',
    title: 'Kitchen Shaft',
    emoji: '🍜',
    blurb: 'Malaysian dishes, fruits, cheeses and kopi.',
    levels: 4,
  },
  {
    id: 'nature',
    category: 'nature',
    title: 'Jungle Shaft',
    emoji: '🌿',
    blurb: 'Wild cats, sharks, dogs and flowers.',
    levels: 4,
  },
  {
    id: 'words',
    category: 'words',
    title: 'Archive Shaft',
    emoji: '📜',
    blurb: 'Gods, presidents, colours and car brands.',
    levels: 5,
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
