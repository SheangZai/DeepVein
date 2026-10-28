import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { DEPTH_ZONES, MAX_DEPTH } from '@/game/tiers';
import { C, F, R } from '@/theme';

/** Vertical cross-section of the mine with the buddy sunk to `depth`. */
export function DepthShaft({ depth, buddy, height = 300 }: { depth: number; buddy: string; height?: number }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: Math.min(1, depth / MAX_DEPTH),
      duration: 1600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [depth, progress]);

  const markerSize = 36;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height - markerSize],
  });

  return (
    <View style={[styles.shaft, { height }]}>
      {DEPTH_ZONES.map((zone, i) => {
        const to = DEPTH_ZONES[i + 1]?.from ?? MAX_DEPTH;
        const reached = depth >= zone.from;
        return (
          <View key={zone.name} style={[styles.zone, { flex: (to - zone.from) / MAX_DEPTH }]}>
            <LinearGradient
              colors={[zone.color, `${zone.color}bb`]}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.zoneLabel, !reached && styles.unreached]}>{zone.name}</Text>
            <Text style={styles.zoneDepth}>{zone.from.toLocaleString()} m</Text>
          </View>
        );
      })}
      {/* The tunnel dug so far. */}
      <Animated.View
        style={[
          styles.tunnel,
          { height, transform: [{ translateY: Animated.subtract(translateY, height - markerSize / 2) }] },
        ]}
      />
      <Animated.View style={[styles.marker, { height: markerSize, transform: [{ translateY }] }]}>
        <View style={styles.buddy}>
          <Text style={styles.markerEmoji}>{buddy}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shaft: {
    borderRadius: R.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: C.border,
  },
  zone: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 4,
    minHeight: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.35)',
  },
  zoneLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: F.bold, letterSpacing: 0.5 },
  unreached: { color: 'rgba(255,255,255,0.45)' },
  zoneDepth: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontFamily: F.medium },
  tunnel: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 10,
    marginLeft: -5,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  marker: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddy: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerEmoji: { fontSize: 20 },
});
