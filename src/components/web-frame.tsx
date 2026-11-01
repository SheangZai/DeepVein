import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { C, F, R, S } from '@/theme';

import { AdSlot, adsEnabled } from './ad-slot';
import { Icon, type IconName } from './icons';
import { Strata } from './strata';

const RAIL = 300;
const GAP = 24;
const MAX_COLUMN = 640;
/** Below this width the web build fills the window, like on a phone. */
const WIDE = 1200;

/**
 * On wide web screens, puts the app in a centred column with a rail on each
 * side (tips now, ad units once ads are switched on). Elsewhere it does nothing.
 */
export function WebFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < WIDE) return <>{children}</>;
  const column = Math.min(MAX_COLUMN, width - 2 * (RAIL + GAP));

  return (
    <View style={styles.page}>
      <Strata dim={0.5} />
      <View style={styles.rail}>
        {adsEnabled ? (
          <AdSlot slot={process.env.EXPO_PUBLIC_ADSENSE_SLOT_LEFT} height={600} />
        ) : (
          <RailCard title="How to dig">
            <Tip icon="pickaxe" text="Name answers that fit the category." />
            <Tip icon="gem" text="Rare answers dig deeper and score more." />
            <Tip icon="heart" text="Wrong answers, passes and timeouts cost a life. You have three." />
          </RailCard>
        )}
      </View>
      <View style={[styles.column, { width: column }]}>{children}</View>
      <View style={styles.rail}>
        {adsEnabled ? (
          <AdSlot slot={process.env.EXPO_PUBLIC_ADSENSE_SLOT_RIGHT} height={600} />
        ) : (
          <RailCard title="TNT Toss">
            <Tip icon="tnt" text="Pass the TNT by naming an answer before the fuse burns out." />
            <Tip icon="globe" text="Quick Play is ranked. Climb the ladder." />
            <Tip icon="user" text="Share your room code to play with friends." />
          </RailCard>
        )}
      </View>
    </View>
  );
}

function RailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

function Tip({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.tip}>
      <Icon name={icon} size={18} color={C.accent} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: GAP, backgroundColor: C.edge },
  rail: { width: RAIL, paddingTop: 96, alignItems: 'center' },
  column: {
    height: '100%',
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  card: {
    width: RAIL,
    gap: S.md,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(18,12,8,0.85)',
  },
  title: { color: C.accent, fontFamily: F.display, fontSize: 22 },
  tip: { flexDirection: 'row', gap: S.sm, alignItems: 'flex-start' },
  tipText: { flex: 1, color: C.text, fontFamily: F.regular, fontSize: 14, lineHeight: 20 },
});
