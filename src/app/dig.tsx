import { router, useLocalSearchParams } from 'expo-router';
import Stack from 'expo-router/stack';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, withTiming, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DailySocial } from '@/components/daily-social';
import { DigReveal } from '@/components/dig-reveal';
import { FuseBar } from '@/components/fuse-bar';
import { Gem } from '@/components/gem';
import { Icon, type IconName } from '@/components/icons';
import { ResultsView } from '@/components/results-view';
import { Strata } from '@/components/strata';
import { Body, Button, Card, Center, Heading, IconBadge, Input, Label, Muted, Row, Screen } from '@/components/ui';
import { CATEGORY_LABELS } from '@/content';
import { getShaft, shaftLevelPrompts } from '@/content/shafts';
import { useDig } from '@/hooks/use-dig';
import { currentDigNo, digDateLabel, endlessDailyPrompts, endlessRandomPrompts } from '@/game/schedule';
import { depthFor, DIG_LIVES, SECONDS_PER_PROMPT, SHAFT_DEPTH, zoneFor } from '@/game/tiers';
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
  /** Endless digs run until the lives are gone or the player ends them. */
  endless: boolean;
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
      promptIds: endlessDailyPrompts(digNo),
      endless: true,
      locked: null,
      existing: p.daily[digNo] ?? p.archive[digNo] ?? null,
    };
  }
  if (mode === 'unlimited') {
    return {
      mode,
      label: 'Deepvein ∞',
      title: 'Unlimited',
      promptIds: endlessRandomPrompts(p.recentUnlimited),
      endless: true,
      locked: null,
      existing: null,
    };
  }
  if (mode === 'shaft') {
    const shaft = getShaft(params.shaft ?? '');
    const level = Number(params.level) || 1;
    if (!shaft) {
      return { mode, label: '', title: 'Shaft', promptIds: [], endless: false, locked: 'Unknown shaft.', existing: null };
    }
    return {
      mode,
      shaftId: shaft.id,
      level,
      label: `Deepvein ${shaft.title} L${level}`,
      title: `${shaft.emoji} ${shaft.title} · Level ${level}`,
      promptIds: shaftLevelPrompts(shaft, level),
      endless: false,
      locked: null,
      existing: p.shafts[shaftKey(shaft.id, level)] ?? null,
    };
  }
  return {
    mode: 'daily',
    digNo: today,
    label: `Deepvein #${today}`,
    title: `Daily Dig #${today}`,
    promptIds: endlessDailyPrompts(today),
    endless: true,
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
  const dig = useDig(plan.promptIds, onFinish, { endless: plan.endless });
  const [text, setText] = useState('');
  const [confirmQuit, setConfirmQuit] = useState(false);
  const score = scoreOf(dig.answers);
  const depth = depthFor(score);

  // "End dig" needs a second tap within a few seconds.
  useEffect(() => {
    if (!confirmQuit) return;
    const t = setTimeout(() => setConfirmQuit(false), 3000);
    return () => clearTimeout(t);
  }, [confirmQuit]);

  const begin = () => {
    if (plan.mode === 'unlimited') noteUnlimitedStarted(plan.promptIds.slice(0, 21));
    dig.start();
  };

  const send = () => {
    if (!text.trim()) return;
    dig.submit(text);
    setText('');
  };

  const endDig = () => {
    if (confirmQuit) dig.quit();
    else setConfirmQuit(true);
  };

  if (dig.phase === 'ready') {
    return (
      <Screen scroll={false}>
        <Center>
          <IconBadge name="pickaxe" size={96} />
          <Text style={styles.readyTitle}>{plan.title}</Text>
          <Row style={styles.meta}>
            {plan.endless ? (
              <>
                <MetaPill icon="infinity" text="Endless prompts" />
                <MetaPill icon="heart" text={`${DIG_LIVES} lives`} />
              </>
            ) : (
              <MetaPill icon="layers" text={`${plan.promptIds.length} prompts`} />
            )}
            <MetaPill icon="clock" text={`${SECONDS_PER_PROMPT}s each`} />
          </Row>
          <Body style={styles.centerText}>Any correct answer counts.{'\n'}Rarer answers dig deeper.</Body>
          <Muted style={styles.centerText}>
            {plan.endless
              ? `Wrong answers, passes and burnt-out fuses cost a life. Lose all ${DIG_LIVES} and the tunnel caves in, or end the dig any time.`
              : 'One attempt. The fuse lights when you tap.'}
          </Muted>
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
  const final = dig.cavedIn || dig.index + 1 >= plan.promptIds.length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <Strata dim={0.25} />
      <DepthTint depth={depth} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={styles.play} keyboardShouldPersistTaps="handled">
          <Row style={styles.topRow}>
            <Label style={styles.flex}>
              {CATEGORY_LABELS[prompt.category]} · {plan.endless ? `#${dig.index + 1}` : `${dig.index + 1} of ${plan.promptIds.length}`}
            </Label>
            {dig.lives !== null && <Lives lives={dig.lives} />}
            <Row style={styles.depthPill}>
              <Icon name="arrowDown" size={14} color={C.accent} strokeWidth={3} />
              <Text style={styles.depthText}>{depth.toLocaleString()} m</Text>
            </Row>
          </Row>

          {plan.endless ? (
            <RecentFinds answers={dig.answers} />
          ) : (
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
          )}

          <Animated.View key={prompt.id + dig.index} entering={FadeInDown.duration(260)}>
            <Card style={[styles.promptCard, showingFeedback && styles.promptCardSmall]}>
              <Text style={[styles.promptText, showingFeedback && styles.promptTextSmall]}>{prompt.text}</Text>
            </Card>
          </Animated.View>

          {showingFeedback ? (
            <DigReveal
              key={dig.index}
              answer={last}
              prevScore={score - last.points}
              lives={dig.lives}
              final={final}
              onNext={dig.next}
            />
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

          {plan.endless && !(showingFeedback && final) && (
            <Button
              label={confirmQuit ? 'Tap again to end the dig' : 'End dig'}
              variant={confirmQuit ? 'danger' : 'ghost'}
              onPress={endDig}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Lives({ lives }: { lives: number }) {
  return (
    <Row style={styles.lives}>
      {Array.from({ length: DIG_LIVES }, (_, h) => (
        <Icon
          key={h}
          name="heart"
          size={15}
          filled={h < lives}
          color={h < lives ? C.danger : C.faint}
          strokeWidth={2.4}
        />
      ))}
    </Row>
  );
}

/** The last few gems of an endless dig. */
function RecentFinds({ answers }: { answers: AnswerRecord[] }) {
  const shown = answers.slice(-10);
  const hidden = answers.length - shown.length;
  return (
    <Row style={styles.recent}>
      {answers.length === 0 && <Muted>Your finds will show up here.</Muted>}
      {hidden > 0 && <Text style={styles.more}>+{hidden}</Text>}
      {shown.map((a, i) => (
        <Animated.View key={hidden + i} entering={ZoomIn.springify().damping(12)}>
          <Gem tier={a.tier} size={22} />
        </Animated.View>
      ))}
    </Row>
  );
}

/** Tints the backdrop toward the current depth zone and darkens it as you go down. */
function DepthTint({ depth }: { depth: number }) {
  const zone = zoneFor(depth);
  const darkness = 0.1 + 0.55 * Math.min(1, depth / SHAFT_DEPTH);
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
    padding: S.lg,
    gap: S.md,
    paddingBottom: S.xl,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  tint: { opacity: 0.22 },
  shade: { backgroundColor: '#000' },
  topRow: { gap: S.sm },
  lives: { gap: 2 },
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
  recent: { gap: 6, minHeight: 26, flexWrap: 'wrap' },
  more: { color: C.muted, fontFamily: F.bold, fontSize: 13 },
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
  promptCardSmall: { paddingVertical: S.md, minHeight: 0 },
  promptText: { color: C.text, fontSize: 27, fontFamily: F.heavy, lineHeight: 34 },
  promptTextSmall: { fontSize: 18, lineHeight: 24 },
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
});
