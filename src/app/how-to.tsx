import { StyleSheet, Text } from 'react-native';

import { Body, Card, Heading, Muted, Row, Screen, TierChip } from '@/components/ui';
import { RESET_UTC_OFFSET_HOURS } from '@/game/schedule';
import { START_FUSE_MS, MIN_FUSE_MS } from '@/game/tnt';
import { ANSWER_TIERS, BUDDIES, DIG_LIVES, METERS_PER_POINT, SECONDS_PER_PROMPT, TIERS } from '@/game/tiers';
import { C, F, S } from '@/theme';

export default function HowTo() {
  return (
    <Screen>
      <Card>
        <Heading>The daily dig</Heading>
        <Body>
          Everyone digs through the same prompts in the same order each day, for as long as they like. You have{' '}
          {SECONDS_PER_PROMPT} seconds per prompt to name anything that fits. Every correct answer counts, but the
          rarer it is, the deeper you dig.
        </Body>
        <Body>
          You have {DIG_LIVES} lives. A wrong answer, a pass or a burnt-out fuse costs one. Lose them all and the
          tunnel caves in, or end the dig whenever you like.
        </Body>
        <Muted>
          New dig every midnight (UTC{RESET_UTC_OFFSET_HOURS >= 0 ? '+' : ''}
          {RESET_UTC_OFFSET_HOURS}). Each point is {METERS_PER_POINT} m.
        </Muted>
      </Card>

      <Card>
        <Heading>What you can strike</Heading>
        {ANSWER_TIERS.map((id) => (
          <Row key={id} style={styles.tierRow}>
            <TierChip tier={id} />
            <Muted style={styles.flex}>{TIERS[id].blurb}</Muted>
          </Row>
        ))}
        <Row style={styles.tierRow}>
          <TierChip tier="miss" />
          <Muted style={styles.flex}>{TIERS.miss.blurb}</Muted>
        </Row>
        <Muted>
          Fool’s Gold is the “obscure” answer everyone reaches for. Each prompt hides exactly one Diamond.
        </Muted>
      </Card>

      <Card>
        <Heading>Streak buddies</Heading>
        <Body>Dig every day to unlock new companions:</Body>
        {BUDDIES.map((b) => (
          <Row key={b.id} style={styles.buddyRow}>
            <Text style={styles.buddyEmoji}>{b.emoji}</Text>
            <Text style={styles.buddy}>
              {b.name} <Text style={styles.buddyNote}>{b.streak > 0 ? `· ${b.streak}-day streak` : '· everyone starts here'}</Text>
            </Text>
          </Row>
        ))}
      </Card>

      <Card>
        <Heading>TNT Toss</Heading>
        <Body>
          Multiplayer for 2–8 miners. Name an answer that fits the category to pass the lit TNT. Wrong answers
          and repeats don’t count, but you can keep trying until the fuse runs out. The fuse starts at{' '}
          {START_FUSE_MS / 1000} seconds and gets shorter with every pass, down to {MIN_FUSE_MS / 1000}. If it
          blows on you, you lose a heart and a new category starts. Last miner standing wins.
        </Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tierRow: { alignItems: 'flex-start', paddingVertical: S.xs },
  flex: { flex: 1 },
  buddyRow: { gap: S.md },
  buddyEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  buddy: { color: C.text, fontSize: 15, lineHeight: 26, fontFamily: F.semi, flex: 1 },
  buddyNote: { color: C.muted, fontFamily: F.regular },
});
