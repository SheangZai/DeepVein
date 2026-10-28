import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { C, R } from '@/theme';

const HEIGHT = 12;
const SPARK = 22;

/** A burning fuse: the lit part shrinks toward the left with a flickering spark at its tip. */
export function FuseBar({ fraction }: { fraction: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  const hot = f <= 0.25;
  const reduceMotion = useReducedMotion();
  const flicker = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    flicker.value = withRepeat(
      withSequence(withTiming(1.35, { duration: 90 }), withTiming(0.85, { duration: 110 }), withTiming(1.1, { duration: 80 })),
      -1,
    );
    return () => cancelAnimation(flicker);
  }, [flicker, reduceMotion]);

  const sparkStyle = useAnimatedStyle(() => ({ transform: [{ scale: flicker.value }] }));

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${f * 100}%` }]}>
          <LinearGradient
            colors={hot ? [C.danger, C.fuse] : [C.fuse, C.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.twist} />
        </View>
      </View>
      {f > 0 && (
        <Animated.View style={[styles.spark, { left: `${f * 100}%` }, sparkStyle]}>
          <View style={[styles.sparkGlow, hot && { backgroundColor: C.danger }]} />
          <View style={styles.sparkCore} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: SPARK, justifyContent: 'center', marginHorizontal: SPARK / 2 },
  track: {
    height: HEIGHT,
    borderRadius: R.pill,
    backgroundColor: C.edge,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: R.pill, overflow: 'hidden' },
  twist: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 3,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  spark: {
    position: 'absolute',
    width: SPARK,
    height: SPARK,
    marginLeft: -SPARK / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkGlow: {
    position: 'absolute',
    width: SPARK,
    height: SPARK,
    borderRadius: SPARK / 2,
    backgroundColor: C.fuse,
    opacity: 0.45,
  },
  sparkCore: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.spark },
});
