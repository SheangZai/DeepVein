import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { getPrompt } from '@/content';
import { matchAnswer } from '@/content/build';
import { DIG_LIVES, SECONDS_PER_PROMPT, TIERS } from '@/game/tiers';
import type { AnswerRecord } from '@/lib/progress';

export type DigPhase = 'ready' | 'playing' | 'feedback' | 'done';

const PROMPT_MS = SECONDS_PER_PROMPT * 1000;

function haptic(record: AnswerRecord) {
  if (Platform.OS === 'web') return;
  const done =
    record.tier === 'miss'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      : record.points >= 60
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  done.catch(() => {});
}

/**
 * Runs a dig. `endless` digs keep serving prompts until the player runs out of
 * lives or quits; otherwise the dig ends after the last prompt. After each
 * answer the phase stays on 'feedback' until the screen calls `next()`.
 */
export function useDig(
  promptIds: string[],
  onFinish: (answers: AnswerRecord[]) => void,
  { endless = false }: { endless?: boolean } = {},
) {
  const [phase, setPhase] = useState<DigPhase>('ready');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(Date.now);
  const resolving = useRef(false);
  const finished = useRef(false);

  const misses = answers.filter((a) => a.tier === 'miss').length;
  const lives = endless ? Math.max(0, DIG_LIVES - misses) : null;

  const start = useCallback(() => {
    resolving.current = false;
    setIndex(0);
    setAnswers([]);
    setDeadline(Date.now() + PROMPT_MS);
    setPhase('playing');
  }, []);

  const resolve = useCallback(
    (input: string) => {
      if (resolving.current) return;
      resolving.current = true;
      const prompt = getPrompt(promptIds[index]);
      const entry = input.trim() ? matchAnswer(prompt, input) : null;
      const tier = entry?.tier ?? 'miss';
      const record: AnswerRecord = {
        promptId: prompt.id,
        input: input.trim(),
        matched: entry?.name ?? null,
        tier,
        points: TIERS[tier].points,
      };
      haptic(record);
      setAnswers((prev) => [...prev, record]);
      setPhase('feedback');
    },
    [index, promptIds],
  );

  // Countdown while a prompt is open.
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= deadline) resolve('');
    }, 100);
    return () => clearInterval(t);
  }, [phase, deadline, resolve]);

  /** Leave the result screen for the next prompt, or end the dig. */
  const next = useCallback(() => {
    if (phase !== 'feedback') return;
    const outOfPrompts = index + 1 >= promptIds.length;
    if (outOfPrompts || lives === 0) {
      setPhase('done');
      return;
    }
    resolving.current = false;
    setIndex(index + 1);
    setDeadline(Date.now() + PROMPT_MS);
    setPhase('playing');
  }, [phase, index, promptIds.length, lives]);

  /** End the dig now. A prompt that is still open is not counted. */
  const quit = useCallback(() => {
    if (phase === 'playing' || phase === 'feedback') {
      resolving.current = true;
      setPhase('done');
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'done' && !finished.current) {
      finished.current = true;
      onFinish(answers);
    }
  }, [phase, answers, onFinish]);

  const remainingMs = phase === 'playing' ? Math.max(0, deadline - now) : 0;

  return {
    phase,
    index,
    prompt: promptIds[index] ? getPrompt(promptIds[index]) : null,
    answers,
    lastAnswer: answers[answers.length - 1] ?? null,
    lives,
    /** True when the answer on screen used up the last life. */
    cavedIn: lives === 0,
    remainingMs,
    remainingFraction: remainingMs / PROMPT_MS,
    start,
    submit: resolve,
    next,
    quit,
  };
}
