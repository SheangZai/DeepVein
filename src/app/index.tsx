import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Gem, GemRow } from '@/components/gem';
import { Icon, type IconName } from '@/components/icons';
import { Strata } from '@/components/strata';
import { Button, Card, IconBadge, Label, Muted, Row } from '@/components/ui';
import { currentDigNo, formatCountdown, msUntilNextDig } from '@/game/schedule';
import { depthFor, DIG_LIVES, SECONDS_PER_PROMPT, zoneFor } from '@/game/tiers';
import { buddyFor, liveStreak, progressStore } from '@/lib/progress';
import { useStore } from '@/lib/storage';
import { C, F, R, S } from '@/theme';

function useNow(intervalMs: number) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export default function Home() {
  const progress = useStore(progressStore);
  const now = useNow(1000);
  const digNo = currentDigNo(now);
  const today = progress.daily[digNo];
  const streak = liveStreak(progress, now);
  const buddy = buddyFor(progress);
  const openDaily = () => router.push({ pathname: '/dig', params: { mode: 'daily' } });

  return (
    <SafeAreaView style={styles.safe}>
      <Strata dim={0.2} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Icon name="pickaxe" size={30} color={C.accent} strokeWidth={2.4} />
            <Text style={styles.logo}>DEEPVEIN</Text>
          </View>
          <Text style={styles.tagline}>Dig for the answers nobody else finds.</Text>
        </View>

        <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => [styles.stats, pressed && styles.pressed]}>
          <View style={styles.stat}>
            <View style={styles.buddy}>
              <Text style={styles.buddyEmoji}>{buddy.emoji}</Text>
            </View>
            <Text style={styles.statLabel} numberOfLines={1}>
              {buddy.name}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Row style={styles.statValueRow}>
              <Icon name="flame" size={22} color={streak > 0 ? C.fuse : C.faint} filled={streak > 0} strokeWidth={1.6} />
              <Text style={styles.statValue}>{streak}</Text>
            </Row>
            <Text style={styles.statLabel}>day streak</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Row style={styles.statValueRow}>
              <Gem tier="diamond" size={22} />
              <Text style={styles.statValue}>{progress.gems}</Text>
            </Row>
            <Text style={styles.statLabel}>gems found</Text>
          </View>
        </Pressable>

        <Card style={styles.daily}>
          <Row style={styles.dailyTop}>
            <Label style={styles.dailyLabel}>Daily Dig #{digNo}</Label>
            {today && (
              <Row style={styles.done}>
                <Icon name="check" size={14} color={C.good} strokeWidth={3} />
                <Text style={styles.doneText}>Dug</Text>
              </Row>
            )}
          </Row>
          {today ? (
            <>
              <Text style={styles.dailyScore}>{depthFor(today.score).toLocaleString()} m</Text>
              <Text style={styles.zone}>
                {zoneFor(depthFor(today.score)).name} · {today.score} pts · {today.answers.length} dug
              </Text>
              <GemRow answers={today.answers} size={30} gap={6} />
              <Row style={styles.countdown}>
                <Icon name="clock" size={16} color={C.muted} />
                <Muted>Next vein opens in {formatCountdown(msUntilNextDig(now))}</Muted>
              </Row>
              <Button label="See results" variant="secondary" onPress={openDaily} />
            </>
          ) : (
            <>
              <Text style={styles.dailyTitle}>Today’s vein is open</Text>
              <Row style={styles.meta}>
                <MetaPill icon="infinity" text="Endless" />
                <MetaPill icon="heart" text={`${DIG_LIVES} lives`} />
                <MetaPill icon="clock" text={`${SECONDS_PER_PROMPT}s each`} />
                <MetaPill icon="gem" text="Rare = deep" />
              </Row>
              <Button label="Start digging" icon="pickaxe" onPress={openDaily} />
            </>
          )}
        </Card>

        <Label style={styles.section}>More ways to dig</Label>
        <View style={styles.tiles}>
          <Tile
            icon="infinity"
            color="#7cc8ff"
            title="Unlimited"
            sub="Endless digs"
            onPress={() => router.push({ pathname: '/dig', params: { mode: 'unlimited' } })}
          />
          <Tile icon="calendar" color="#b59cff" title="Archive" sub="Past daily digs" onPress={() => router.push('/archive')} />
          <Tile icon="layers" color={C.good} title="Shafts" sub="Themed packs" onPress={() => router.push('/shafts')} />
          <Tile icon="tnt" color={C.danger} title="TNT Toss" sub="Multiplayer" onPress={() => router.push('/party')} />
        </View>

        <Row style={styles.footer}>
          <FooterLink icon="help" label="How to dig" onPress={() => router.push('/how-to')} />
          <FooterLink icon="user" label="Miner" onPress={() => router.push('/profile')} />
        </Row>
      </ScrollView>
    </SafeAreaView>
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

function Tile({
  icon,
  color,
  title,
  sub,
  onPress,
}: {
  icon: IconName;
  color: string;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
      <IconBadge name={icon} color={color} size={44} />
      <View style={styles.tileText}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function FooterLink({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.footerLink, pressed && styles.pressed]}>
      <Icon name={icon} size={18} color={C.muted} />
      <Text style={styles.footerText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: {
    padding: S.lg,
    paddingTop: S.xl,
    paddingBottom: S.xxl,
    gap: S.md,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: { alignItems: 'center', gap: S.xs, marginBottom: S.sm },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  logo: {
    color: C.accent,
    fontSize: 46,
    fontFamily: F.display,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  tagline: { color: C.text, opacity: 0.8, fontSize: 14, fontFamily: F.medium },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,6,4,0.55)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: R.lg,
    paddingVertical: S.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValueRow: { gap: 6, minHeight: 34 },
  statValue: { color: C.text, fontSize: 24, fontFamily: F.display },
  statLabel: { color: C.muted, fontSize: 12, fontFamily: F.medium, paddingHorizontal: 4 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.08)' },
  buddy: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: C.accent,
    backgroundColor: C.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyEmoji: { fontSize: 18 },
  daily: {
    gap: S.md,
    borderColor: C.accent,
    borderTopColor: '#ffe08a',
    borderBottomColor: C.accentEdge,
    borderWidth: 2,
    borderBottomWidth: 5,
    paddingVertical: S.xl,
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  dailyTop: { justifyContent: 'space-between' },
  dailyLabel: { color: C.accent },
  done: { gap: 4 },
  doneText: { color: C.good, fontFamily: F.bold, fontSize: 13 },
  dailyTitle: { color: C.text, fontSize: 30, fontFamily: F.display, lineHeight: 34 },
  dailyScore: { color: C.accent, fontSize: 52, fontFamily: F.display, lineHeight: 56 },
  zone: { color: C.text, fontSize: 15, fontFamily: F.semi, marginTop: -S.sm },
  countdown: { gap: 6 },
  meta: { flexWrap: 'wrap', gap: 6 },
  pill: {
    gap: 5,
    backgroundColor: C.edge,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { color: C.text, fontSize: 13, fontFamily: F.semi },
  section: { marginTop: S.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderTopColor: C.highlight,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderBottomColor: C.edge,
    borderRadius: R.lg,
    padding: S.md,
  },
  tilePressed: { borderBottomWidth: 1, marginTop: 3 },
  tileText: { flex: 1 },
  tileTitle: { color: C.text, fontSize: 16, fontFamily: F.bold },
  tileSub: { color: C.muted, fontSize: 12, fontFamily: F.regular, marginTop: 1 },
  footer: { justifyContent: 'space-around', marginTop: S.md },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: S.sm },
  footerText: { color: C.muted, fontSize: 14, fontFamily: F.semi },
  pressed: { opacity: 0.7 },
});
