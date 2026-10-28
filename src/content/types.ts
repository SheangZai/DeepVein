import type { AnswerTierId } from '@/game/tiers';

export type CategoryId = 'geography' | 'science' | 'sports' | 'screen' | 'food' | 'nature' | 'words';

/**
 * Authoring format for one prompt. Each answer is "Canonical|alias|alias".
 * Exactly one answer is the diamond (the designated gem); every other
 * accepted answer sits in one tier list. Anything not listed is a miss.
 */
export interface PromptSource {
  id: string;
  category: CategoryId;
  text: string;
  dirt?: string[];
  fools?: string[];
  copper?: string[];
  emerald?: string[];
  ruby?: string[];
  diamond: string;
}

export interface AnswerEntry {
  /** Stable id: `${promptId}:${n}`. */
  id: string;
  name: string;
  tier: AnswerTierId;
}

export interface Prompt {
  id: string;
  category: CategoryId;
  text: string;
  entries: AnswerEntry[];
  gem: AnswerEntry;
  keys: Map<string, number>;
  signatures: Map<string, string>;
}
