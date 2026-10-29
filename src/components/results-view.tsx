import * as Clipboard from 'expo-clipboard';
import { useState, type ReactNode } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { getPrompt } from '@/content';
import { depthFor, TIERS, zoneFor } from '@/game/tiers';
import { gridOf, type AnswerRecord } from '@/lib/progress';
import { C, F, R, S } from '@/theme';

import { DepthShaft } from './depth-shaft';
import { Gem, GemRow } from './gem';
import { Button, Card, Label, Muted, Row, TierChip } from './ui';

export function shareText(label: string, answers: AnswerRecord[], score: number) {
  const depth = depthFor(score);
  const n = answers.length;
  return `${label} ⛏️ ${depth.toLocaleString()} m · ${score} pts · ${n} prompt${n === 1 ? '' : 's'}\n${gridOf(answers, 30)}`;
}

export function ResultsView({
  label,
  answers,
  score,
  buddy,
  children,
}: {
  label: string;
  answers: AnswerRecord[];
  score: number;
  buddy: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const depth = depthFor(score);
  const zone = zoneFor(depth);
  const text = shareText(label, answers, score);

  const copy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.wrap}>
      <Card style={styles.hero}>
        <Label>{label}</Label>
        <Text style={styles.depth}>{depth.toLocaleString()} m</Text>
        <Row style={styles.zoneRow}>
          <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
          <Text style={styles.zone}>
            {zone.name} · {score} pts · {answers.length} dug
          </Text>
        </Row>
        <View style={styles.gems}>
          <GemRow answers={answers} size={34} gap={6} />
        </View>
        <Row style={styles.shareRow}>
          <Button label="Share" icon="share" onPress={() => Share.share({ message: text })} style={styles.flex} />
          <Button
            label={copied ? 'Copied!' : 'Copy'}
            icon={copied ? 'check' : 'copy'}
            variant="secondary"
            onPress={copy}
            style={styles.flex}
          />
        </Row>
      </Card>

      <DepthShaft depth={depth} buddy={buddy} />

      {children}

      <Label style={styles.section}>Your finds</Label>
      {answers.map((a, i) => {
        const prompt = getPrompt(a.promptId);
        return (
          <Animated.View key={a.promptId + i} entering={FadeInDown.delay(80 * i).duration(300)}>
            <Card style={styles.find}>
              <Row style={styles.findRow}>
                <Gem tier={a.tier} size={36} />
                <View style={styles.flex}>
                  <Muted style={styles.findPrompt}>{prompt.text}</Muted>
                  <Text style={[styles.findAnswer, a.tier === 'miss' && styles.findMiss]}>
                    {a.matched ?? (a.input ? `“${a.input}”` : 'No answer')}
                  </Text>
                </View>
                <TierChip tier={a.tier} compact />
              </Row>
              {a.tier !== 'diamond' && (
                <Row style={styles.hidden}>
                  <Gem tier="diamond" size={14} />
                  <Muted style={styles.hiddenText}>
                    Hidden gem: <Text style={styles.gem}>{prompt.gem.name}</Text>
                  </Muted>
                </Row>
              )}
            </Card>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.md },
  hero: { alignItems: 'center', gap: S.xs, paddingVertical: S.xl, borderColor: C.accent, borderTopColor: '#ffe08a', borderWidth: 2 },
  depth: { color: C.accent, fontSize: 56, fontFamily: F.display, lineHeight: 62 },
  zoneRow: { gap: 6 },
  zoneDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  zone: { color: C.text, fontFamily: F.semi, fontSize: 15 },
  gems: { marginVertical: S.md },
  shareRow: { alignSelf: 'stretch' },
  flex: { flex: 1 },
  section: { marginTop: S.sm },
  find: { gap: S.sm, padding: S.md },
  findRow: { gap: S.md },
  findPrompt: { fontSize: 13 },
  findAnswer: { color: C.text, fontFamily: F.bold, fontSize: 17, marginTop: 1 },
  findMiss: { color: C.muted },
  hidden: {
    gap: 6,
    backgroundColor: C.edge,
    borderRadius: R.sm,
    paddingHorizontal: S.sm,
    paddingVertical: 6,
  },
  hiddenText: { fontSize: 13, flex: 1 },
  gem: { color: TIERS.diamond.color, fontFamily: F.bold },
});
