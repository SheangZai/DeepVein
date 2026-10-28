import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { getPrompt } from '@/content';
import { matchAnswer } from '@/content/build';
import { SECONDS_PER_PROMPT, TIERS } from '@/game/tiers';
import type { AnswerRecord } from '@/lib/progress';

export type DigPhase = 'ready' | 'playing' | 'feedback' | 'done';

const FEEDBACK_MS = 1400;
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

export function useDig(promptIds: string[], onFinish: (answers: AnswerRecord[]) => void) {
  const [phase, setPhase] = useState<DigPhase>('ready');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(Date.now);
  const resolving = useRef(false);
  const finished = useRef(false);

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

  // After showing the result of a prompt, move on.
  useEffect(() => {
    if (phase !== 'feedback') return;
    const t = setTimeout(() => {
      if (index + 1 >= promptIds.length) {
        setPhase('done');
      } else {
        resolving.current = false;
        setIndex(index + 1);
        setDeadline(Date.now() + PROMPT_MS);
        setPhase('playing');
      }
    }, FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [phase, index, promptIds.length]);

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
    remainingMs,
    remainingFraction: remainingMs / PROMPT_MS,
    start,
    submit: resolve,
  };
}
