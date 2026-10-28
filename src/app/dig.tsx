import { router, useLocalSearchParams } from 'expo-router';
import Stack from 'expo-router/stack';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DailySocial } from '@/components/daily-social';
import { FuseBar } from '@/components/fuse-bar';
import { Gem } from '@/components/gem';
import { Icon, type IconName } from '@/components/icons';
import { ResultsView } from '@/components/results-view';
import { Strata } from '@/components/strata';
import { Body, Button, Card, Center, Heading, IconBadge, Input, Label, Muted, Row, Screen } from '@/components/ui';
import { CATEGORY_LABELS } from '@/content';
import { getShaft, shaftLevelPrompts } from '@/content/shafts';
import { useDig } from '@/hooks/use-dig';
import {
  currentDigNo,
  digDateLabel,
  promptsForDig,
  randomPrompts,
} from '@/game/schedule';
import { depthFor, MAX_DEPTH, METERS_PER_POINT, SECONDS_PER_PROMPT, TIERS, zoneFor } from '@/game/tiers';
import {
  buddyFor,
  noteUnlimitedStarted,
  progressStore,
  recordResult,
  scoreOf,
  shaftKey,
  type AnswerRecord,
  type DigMode,
  type DigResult,
} from '@/lib/progress';
import { useStore } from '@/lib/storage';
import { C, F, R, S } from '@/theme';

interface Plan {
  mode: DigMode;
  label: string;
  title: string;
  promptIds: string[];
  digNo?: number;
  shaftId?: string;
  level?: number;
  locked: string | null;
  existing: DigResult | null;
}

function makePlan(params: Record<string, string | undefined>): Plan {
  const p = progressStore.get();
  const mode = (params.mode ?? 'daily') as DigMode;
  const today = currentDigNo();

  if (mode === 'archive') {
    const digNo = Math.min(Number(params.dig) || 1, today - 1);
    return {
      mode,
      digNo,
      label: `Deepvein #${digNo}`,
      title: `Dig #${digNo} · ${digDateLabel(digNo)}`,
      promptIds: promptsForDig(digNo),
      locked: null,
      existing: p.daily[digNo] ?? p.archive[digNo] ?? null,
    };
  }
  if (mode === 'unlimited') {
    return {
      mode,
      label: 'Deepvein ∞',
      title: 'Unlimited',
      promptIds: randomPrompts(p.recentUnlimited),
      locked: null,
      existing: null,
    };
  }
  if (mode === 'shaft') {
    const shaft = getShaft(params.shaft ?? '');
    const level = Number(params.level) || 1;
    if (!shaft) {
      return { mode, label: '', title: 'Shaft', promptIds: [], locked: 'Unknown shaft.', existing: null };
    }
    return {
      mode,
      shaftId: shaft.id,
      level,
      label: `Deepvein ${shaft.title} L${level}`,
      title: `${shaft.emoji} ${shaft.title} · Level ${level}`,
      promptIds: shaftLevelPrompts(shaft, level),
      locked: null,
      existing: p.shafts[shaftKey(shaft.id, level)] ?? null,
    };
  }
  return {
    mode: 'daily',
    digNo: today,
    label: `Deepvein #${today}`,
    title: `Daily Dig #${today}`,
    promptIds: promptsForDig(today),
    locked: null,
    existing: p.daily[today] ?? null,
  };
}

export default function DigScreen() {
  const params = useLocalSearchParams<{ mode?: string; dig?: string; shaft?: string; level?: string }>();
  const progress = useStore(progressStore);
  const [plan] = useState(() => makePlan(params));
  const [result, setResult] = useState<DigResult | null>(plan.existing);
  const buddy = buddyFor(progress).emoji;

  const onFinish = useCallback(
    (answers: AnswerRecord[]) => {
      const r: DigResult = {
        mode: plan.mode,
        digNo: plan.digNo,
        shaftId: plan.shaftId,
        level: plan.level,
        answers,
        score: scoreOf(answers),
        finishedAt: Date.now(),
      };
      recordResult(r);
      setResult(r);
    },
    [plan],
  );

  const header = <Stack.Screen options={{ title: plan.title }} />;

  if (plan.locked && !result) {
    return (
      <Screen scroll={false}>
        {header}
        <Center>
          <IconBadge name="x" size={88} color={C.danger} />
          <Heading style={styles.centerText}>{plan.locked}</Heading>
          <Button label="Back" onPress={() => router.back()} style={styles.wide} />
        </Center>
      </Screen>
    );
  }

  if (result) {
    return (
      <Screen>
        {header}
        <ResultsView label={plan.label} answers={result.answers} score={result.score} buddy={buddy}>
          {result.mode === 'daily' && <DailySocial result={result} />}
        </ResultsView>
        {plan.mode === 'unlimited' && (
          <Button
            label="Dig again"
            icon="refresh"
            onPress={() => router.replace({ pathname: '/dig', params: { mode: 'unlimited' } })}
          />
        )}
        <Button label="Home" icon="home" variant="secondary" onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  }

  return (
    <>
      {header}
      <DigPlay plan={plan} onFinish={onFinish} />
    </>
  );
}

function DigPlay({ plan, onFinish }: { plan: Plan; onFinish: (a: AnswerRecord[]) => void }) {
  const dig = useDig(plan.promptIds, onFinish);
  const [text, setText] = useState('');
  const score = scoreOf(dig.answers);
  const depth = depthFor(score);

  const begin = () => {
    if (plan.mode === 'unlimited') noteUnlimitedStarted(plan.promptIds);
    dig.start();
  };

  const send = () => {
    if (!text.trim()) return;
    dig.submit(text);
    setText('');
  };

  if (dig.phase === 'ready') {
    return (
      <Screen scroll={false}>
        <Center>
          <IconBadge name="pickaxe" size={96} />
          <Text style={styles.readyTitle}>{plan.title}</Text>
          <Row style={styles.meta}>
            <MetaPill icon="layers" text={`${plan.promptIds.length} prompts`} />
            <MetaPill icon="clock" text={`${SECONDS_PER_PROMPT}s each`} />
          </Row>
          <Body style={styles.centerText}>Any correct answer counts.{'\n'}Rarer answers dig deeper.</Body>
          <Muted style={styles.centerText}>One attempt. The fuse lights when you tap.</Muted>
          <Button label="Light the fuse" icon="flame" onPress={begin} style={styles.wide} />
        </Center>
      </Screen>
    );
  }

  const prompt = dig.prompt!;
  const last = dig.lastAnswer;
  const showingFeedback = dig.phase === 'feedback' && last;
  const seconds = Math.ceil(dig.remainingMs / 1000);
  const urgent = !showingFeedback && seconds <= 5;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <Strata dim={0.25} />
      <DepthTint depth={depth} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <View style={styles.play}>
          <Row style={styles.topRow}>
            <Label>
              {CATEGORY_LABELS[prompt.category]} · {dig.index + 1} of {plan.promptIds.length}
            </Label>
            <Row style={styles.depthPill}>
              <Icon name="arrowDown" size={14} color={C.accent} strokeWidth={3} />
              <Text style={styles.depthText}>{depth.toLocaleString()} m</Text>
            </Row>
          </Row>

          <View style={styles.slots}>
            {plan.promptIds.map((id, i) => {
              const a = dig.answers[i];
              return (
                <View key={id} style={[styles.slot, i === dig.index && !a && styles.slotCurrent]}>
                  {a ? (
                    <Animated.View entering={ZoomIn.springify().damping(12)}>
                      <Gem tier={a.tier} size={22} />
                    </Animated.View>
                  ) : (
                    <View style={[styles.slotDot, i === dig.index && styles.slotDotCurrent]} />
                  )}
                </View>
              );
            })}
          </View>

          <Animated.View key={prompt.id} entering={FadeInDown.duration(260)}>
            <Card style={styles.promptCard}>
              <Text style={styles.promptText}>{prompt.text}</Text>
            </Card>
          </Animated.View>

          {showingFeedback ? (
            <Feedback key={dig.index} answer={last} />
          ) : (
            <>
              <Row style={styles.timerRow}>
                <Text style={[styles.seconds, urgent && styles.secondsUrgent]}>{seconds}</Text>
                <View style={styles.flex}>
                  <FuseBar fraction={dig.remainingFraction} />
                </View>
              </Row>
              <Input
                value={text}
                onChangeText={setText}
                onSubmitEditing={send}
                autoFocus
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="go"
                placeholder="Type an answer…"
                style={[styles.input, text.trim() !== '' && styles.inputActive]}
                submitBehavior="submit"
              />
              <Row>
                <Button label="Dig" icon="pickaxe" onPress={send} disabled={!text.trim()} style={styles.flex} />
                <Button label="Pass" variant="secondary" onPress={() => dig.submit('')} style={styles.pass} />
              </Row>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Tints the backdrop toward the current depth zone and darkens it as you go down. */
function DepthTint({ depth }: { depth: number }) {
  const zone = zoneFor(depth);
  const darkness = 0.1 + 0.55 * Math.min(1, depth / MAX_DEPTH);
  const tint = useAnimatedStyle(() => ({
    backgroundColor: withTiming(zone.color, { duration: 900 }),
  }));
  const shade = useAnimatedStyle(() => ({
    opacity: withTiming(darkness, { duration: 900 }),
  }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.tint, tint]} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shade]} />
    </View>
  );
}

function Feedback({ answer }: { answer: AnswerRecord }) {
  const tier = TIERS[answer.tier];
  const miss = answer.tier === 'miss';
  const big = answer.points >= 60;
  const reduceMotion = useReducedMotion();
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!miss || reduceMotion) return;
    shake.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withSpring(0),
    );
  }, [miss, reduceMotion, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <Animated.View style={shakeStyle}>
      <Card style={[styles.feedback, { borderColor: tier.color, borderTopColor: tier.color }]}>
        <Animated.View entering={reduceMotion ? undefined : ZoomIn.springify().damping(9)}>
          <Gem tier={answer.tier} size={big ? 84 : 68} glow={!miss} />
        </Animated.View>
        <Text style={[styles.tierName, { color: miss ? C.muted : tier.color }]}>{miss ? (answer.input ? 'Miss' : 'Time’s up!') : tier.name}</Text>
        <Heading style={styles.centerText}>
          {answer.matched ?? (answer.input ? `“${answer.input}” isn’t in this vein` : 'The fuse burned out')}
        </Heading>
        {!miss && (
          <Animated.Text entering={FadeInDown.delay(150)} style={styles.gain}>
            +{(answer.points * METERS_PER_POINT).toLocaleString()} m
          </Animated.Text>
        )}
        <Muted style={styles.centerText}>{tier.blurb}</Muted>
      </Card>
    </Animated.View>
  );
}

function MetaPill({ icon, text }: { icon: IconName; text: string }) {
  return (
    <Row style={styles.pill}>
      <Icon name={icon} size={14} color={C.accent} />
      <Text style={styles.pillText}>{text}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  wide: { alignSelf: 'stretch' },
  centerText: { textAlign: 'center' },
  readyTitle: { color: C.text, fontSize: 30, fontFamily: F.display, textAlign: 'center' },
  meta: { gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  pill: { gap: 5, backgroundColor: C.edge, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { color: C.text, fontSize: 13, fontFamily: F.semi },
  play: {
    flex: 1,
    padding: S.lg,
    gap: S.md,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  tint: { opacity: 0.22 },
  shade: { backgroundColor: '#000' },
  topRow: { justifyContent: 'space-between' },
  depthPill: {
    gap: 4,
    backgroundColor: 'rgba(10,6,4,0.7)',
    borderColor: C.accentEdge,
    borderWidth: 1,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  depthText: { color: C.accent, fontFamily: F.display, fontSize: 18, fontVariant: ['tabular-nums'] },
  slots: { flexDirection: 'row', gap: 6 },
  slot: {
    flex: 1,
    maxWidth: 48,
    aspectRatio: 1,
    borderRadius: R.sm,
    backgroundColor: 'rgba(10,6,4,0.7)',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCurrent: { borderColor: C.accent, borderWidth: 2 },
  slotDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  slotDotCurrent: { backgroundColor: C.accent },
  promptCard: { paddingVertical: S.xl, minHeight: 130, justifyContent: 'center' },
  promptText: { color: C.text, fontSize: 27, fontFamily: F.heavy, lineHeight: 34 },
  timerRow: { gap: S.sm },
  seconds: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 30,
    minWidth: 38,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  secondsUrgent: { color: C.danger },
  input: { fontSize: 21, paddingVertical: S.md + 2 },
  inputActive: { borderColor: C.accent },
  pass: { paddingHorizontal: S.xl },
  feedback: { alignItems: 'center', gap: S.sm, borderWidth: 2, paddingVertical: S.xl },
  tierName: { fontFamily: F.display, fontSize: 32, marginTop: S.xs },
  gain: { color: C.accent, fontFamily: F.display, fontSize: 22 },
});
