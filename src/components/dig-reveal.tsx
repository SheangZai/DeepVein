import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { ANSWER_TIERS, depthFor, DIG_LIVES, METERS_PER_POINT, TIERS } from '@/game/tiers';
import type { AnswerRecord } from '@/lib/progress';
import { C, F, R, S } from '@/theme';

import { Gem } from './gem';
import { Icon } from './icons';
import { Button, Row } from './ui';

const SHAFT_H = 210;
const TOP_PAD = 18;
const BOTTOM_PAD = 22;
const DRILL_MS = 1100;
/** When the points tally appears. */
const TALLY_AT = 1300;
/** When the dig moves on by itself. */
const AUTO_NEXT_AT = 4200;

/** How far down the shaft a tier sits, 0..1 (Diamond is the bottom). */
function tierFraction(points: number) {
  return points / TIERS.diamond.points;
}

function yFor(fraction: number) {
  return TOP_PAD + fraction * (SHAFT_H - TOP_PAD - BOTTOM_PAD);
}

/**
 * Counts from `from` to `to` over `ms`, starting after `delay`. The reveal is
 * remounted for every answer, so the inputs never change mid-count.
 */
function useCountUp(from: number, to: number, ms: number, delay: number, instant: boolean) {
  const skip = instant || from === to;
  const [value, setValue] = useState(skip ? to : from);
  useEffect(() => {
    if (skip) return;
    let raf = 0;
    const t0 = Date.now() + delay;
    const step = () => {
      const k = Math.min(1, Math.max(0, (Date.now() - t0) / ms));
      const eased = 1 - Math.pow(1 - k, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to, ms, delay, skip]);
  return value;
}

/**
 * Shown after every answer: the drill bores down as far as the answer's tier
 * reaches, then the points are tallied, then the dig moves on.
 */
export function DigReveal({
  answer,
  prevScore,
  lives,
  final,
  onNext,
}: {
  answer: AnswerRecord;
  /** Score before this answer. */
  prevScore: number;
  /** Lives left after this answer; null for digs without lives. */
  lives: number | null;
  /** No prompt follows (caved in or out of prompts): wait for a tap. */
  final: boolean;
  onNext: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const tier = TIERS[answer.tier];
  const miss = answer.tier === 'miss';
  const target = miss ? 0.07 : tierFraction(answer.points);
  const newScore = prevScore + answer.points;
  const gained = answer.points * METERS_PER_POINT;

  const [stage, setStage] = useState<'drill' | 'tally'>(reduceMotion ? 'tally' : 'drill');
  const [progress, setProgress] = useState(0);
  const nextRef = useRef(onNext);
  useEffect(() => {
    nextRef.current = onNext;
  }, [onNext]);

  // Drill → tally → auto-advance.
  useEffect(() => {
    const timers = [setTimeout(() => setStage('tally'), reduceMotion ? 0 : TALLY_AT)];
    if (!final) {
      const t0 = Date.now();
      const total = reduceMotion ? AUTO_NEXT_AT - TALLY_AT : AUTO_NEXT_AT;
      const tick = setInterval(() => {
        const k = Math.min(1, (Date.now() - t0) / total);
        setProgress(k);
        if (k >= 1) {
          clearInterval(tick);
          nextRef.current();
        }
      }, 50);
      return () => {
        timers.forEach(clearTimeout);
        clearInterval(tick);
      };
    }
    return () => timers.forEach(clearTimeout);
  }, [final, reduceMotion]);

  const bore = useSharedValue(reduceMotion ? target : 0);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    bore.value = withTiming(target, { duration: miss ? 500 : DRILL_MS, easing: Easing.out(Easing.cubic) });
    if (miss) {
      shake.value = withDelay(
        480,
        withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 60 }),
          withTiming(-6, { duration: 60 }),
          withTiming(6, { duration: 60 }),
          withSpring(0),
        ),
      );
    }
  }, [bore, shake, target, miss, reduceMotion]);

  const boreStyle = useAnimatedStyle(() => ({ height: yFor(bore.value) - TOP_PAD + 6 }));
  const bitStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: yFor(bore.value) - 16 }, { translateX: shake.value }],
  }));

  const depthShown = useCountUp(depthFor(prevScore), depthFor(newScore), 900, reduceMotion ? 0 : 200, reduceMotion);
  const scoreShown = useCountUp(prevScore, newScore, 700, reduceMotion ? 0 : TALLY_AT + 250, reduceMotion);
  const tipY = yFor(target);

  return (
    <View style={styles.wrap}>
      <View style={styles.depthRow}>
        <Icon name="arrowDown" size={16} color={C.accent} strokeWidth={3} />
        <Text style={styles.depth}>{depthShown.toLocaleString()} m</Text>
        {!miss && <Text style={styles.gainedTag}>+{gained.toLocaleString()} m</Text>}
      </View>

      {/* Cross-section: one layer per tier; the drill stops at this answer's layer. */}
      <View style={styles.shaft}>
        <LinearGradient colors={['#5a3d24', '#3d2a1d', '#2a2030', '#1b1730']} style={StyleSheet.absoluteFill} />
        {ANSWER_TIERS.map((id, i) => {
          const y = yFor(tierFraction(TIERS[id].points));
          const reached = !miss && TIERS[id].points <= answer.points;
          const left = i % 2 === 0;
          return (
            <View key={id} style={[styles.layer, { top: y }]}>
              <View style={[styles.layerLine, { backgroundColor: TIERS[id].color, opacity: reached ? 0.7 : 0.22 }]} />
              <View style={[styles.layerTag, left ? styles.tagLeft : styles.tagRight, !reached && styles.dim]}>
                <Gem tier={id} size={13} />
                <Text style={[styles.layerName, { color: reached ? TIERS[id].color : C.faint }]}>{TIERS[id].name}</Text>
              </View>
            </View>
          );
        })}
        <View style={styles.surface} />
        <Animated.View style={[styles.bore, boreStyle]} />
        <Animated.View style={[styles.bit, bitStyle]}>
          <View style={[styles.bitInner, miss && styles.bitMiss]}>
            <Icon name="pickaxe" size={18} color={miss ? C.danger : C.accent} strokeWidth={2.6} />
          </View>
        </Animated.View>
        {stage === 'tally' && (
          <Animated.View
            entering={reduceMotion ? undefined : ZoomIn.springify().damping(9)}
            style={[styles.strike, { top: tipY - 34 }]}>
            {miss ? (
              <Icon name="x" size={30} color={C.danger} strokeWidth={3.5} />
            ) : (
              <Gem tier={answer.tier} size={answer.points >= 60 ? 46 : 38} glow />
            )}
          </Animated.View>
        )}
      </View>

      {stage === 'tally' && (
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(260)} style={[styles.tally, { borderColor: tier.color }]}>
          <Row style={styles.tallyHead}>
            <Gem tier={answer.tier} size={26} />
            <View style={styles.flex}>
              <Text style={[styles.tierName, { color: miss ? C.muted : tier.color }]}>
                {miss ? (answer.input ? 'Miss' : 'Time’s up!') : tier.name}
              </Text>
              <Text style={styles.answer} numberOfLines={2}>
                {answer.matched ?? (answer.input ? `“${answer.input}” isn’t in this vein` : 'The fuse burned out')}
              </Text>
            </View>
            <Text style={[styles.points, miss && styles.pointsMiss]}>+{answer.points}</Text>
          </Row>

          <View style={styles.rule} />

          <Row style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.total}>{scoreShown.toLocaleString()} pts</Text>
          </Row>

          {lives !== null && (
            <Row style={styles.totalRow}>
              <Text style={styles.totalLabel}>LIVES</Text>
              <Row style={styles.hearts}>
                {Array.from({ length: DIG_LIVES }, (_, h) => {
                  const lostNow = miss && h === lives;
                  return (
                    <Animated.View key={h} entering={lostNow && !reduceMotion ? ZoomIn.delay(200) : undefined}>
                      <Icon
                        name="heart"
                        size={18}
                        filled={h < lives}
                        color={h < lives ? C.danger : lostNow ? C.muted : C.faint}
                        strokeWidth={2.4}
                      />
                    </Animated.View>
                  );
                })}
              </Row>
            </Row>
          )}

          {lives === 0 ? (
            <Animated.Text entering={reduceMotion ? undefined : FadeIn.delay(300)} style={styles.caveIn}>
              The tunnel caved in!
            </Animated.Text>
          ) : (
            <Text style={styles.blurb}>{tier.blurb}</Text>
          )}
        </Animated.View>
      )}

      <View>
        <Button
          label={final ? 'See results' : 'Next prompt'}
          icon={final ? 'trophy' : 'pickaxe'}
          onPress={onNext}
          variant={stage === 'tally' ? 'primary' : 'secondary'}
        />
        {!final && (
          <View style={styles.autoTrack}>
            <View style={[styles.autoFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.md },
  flex: { flex: 1 },
  depthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  depth: { color: C.accent, fontFamily: F.display, fontSize: 30, fontVariant: ['tabular-nums'] },
  gainedTag: {
    color: C.good,
    fontFamily: F.bold,
    fontSize: 13,
    backgroundColor: 'rgba(79,209,139,0.14)',
    borderRadius: R.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  shaft: {
    height: SHAFT_H,
    borderRadius: R.md,
    borderWidth: 2,
    borderColor: C.border,
    overflow: 'hidden',
  },
  surface: { position: 'absolute', left: 0, right: 0, top: TOP_PAD - 3, height: 3, backgroundColor: '#7a5a3a' },
  layer: { position: 'absolute', left: 0, right: 0, height: 0 },
  layerLine: { position: 'absolute', left: 0, right: 0, height: 2, top: -1 },
  layerTag: { position: 'absolute', top: -9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagLeft: { left: 10 },
  tagRight: { right: 10 },
  dim: { opacity: 0.55 },
  layerName: { fontFamily: F.bold, fontSize: 10, letterSpacing: 0.5 },
  bore: {
    position: 'absolute',
    top: TOP_PAD,
    left: '50%',
    width: 14,
    marginLeft: -7,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  bit: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  bitInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bitMiss: { borderColor: C.danger },
  strike: { position: 'absolute', left: '50%', marginLeft: 22 },
  tally: {
    backgroundColor: 'rgba(20,13,9,0.94)',
    borderWidth: 2,
    borderRadius: R.md,
    padding: S.md,
    gap: S.sm,
  },
  tallyHead: { gap: S.md, alignItems: 'center' },
  tierName: { fontFamily: F.display, fontSize: 24 },
  answer: { color: C.text, fontFamily: F.semi, fontSize: 15 },
  points: { color: C.accent, fontFamily: F.display, fontSize: 28, fontVariant: ['tabular-nums'] },
  pointsMiss: { color: C.faint },
  rule: { height: 1, backgroundColor: C.border },
  totalRow: { justifyContent: 'space-between' },
  totalLabel: { color: C.muted, fontFamily: F.bold, fontSize: 11, letterSpacing: 2.5 },
  total: { color: C.text, fontFamily: F.display, fontSize: 22, fontVariant: ['tabular-nums'] },
  hearts: { gap: 4 },
  blurb: { color: C.muted, fontFamily: F.regular, fontSize: 13, textAlign: 'center' },
  caveIn: { color: C.danger, fontFamily: F.display, fontSize: 20, textAlign: 'center' },
  autoTrack: { height: 3, borderRadius: 2, backgroundColor: C.edge, marginTop: 6, overflow: 'hidden' },
  autoFill: { height: 3, backgroundColor: C.accent },
});
