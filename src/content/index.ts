import { buildPrompt, type BuildIssue } from './build';
import { food } from './prompts/food';
import { geography } from './prompts/geography';
import { nature } from './prompts/nature';
import { science } from './prompts/science';
import { screen } from './prompts/screen';
import { sports } from './prompts/sports';
import { words } from './prompts/words';
import type { CategoryId, Prompt, PromptSource } from './types';

export const PROMPT_SOURCES: PromptSource[] = [
  ...geography,
  ...science,
  ...sports,
  ...screen,
  ...food,
  ...nature,
  ...words,
];

export const BUILD_ISSUES: BuildIssue[] = [];
export const PROMPTS: Prompt[] = PROMPT_SOURCES.map((src) => buildPrompt(src, BUILD_ISSUES));
const BY_ID = new Map(PROMPTS.map((p) => [p.id, p]));

if (__DEV__ && BUILD_ISSUES.length > 0) {
  console.warn('Prompt content issues:\n' + BUILD_ISSUES.map((i) => `${i.promptId}: ${i.message}`).join('\n'));
}

export function getPrompt(id: string): Prompt {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Unknown prompt ${id}`);
  return p;
}

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  geography: 'Geography',
  science: 'Science',
  sports: 'Sports',
  screen: 'Screen & Music',
  food: 'Food',
  nature: 'Nature',
  words: 'Culture & History',
};

export function promptsInCategory(category: CategoryId): Prompt[] {
  return PROMPTS.filter((p) => p.category === category);
}

export type { AnswerEntry, CategoryId, Prompt } from './types';
