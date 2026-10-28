import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ReactNode } from 'react';

import { Gem } from '@/components/gem';
import { Icon } from '@/components/icons';
import { Body, Button, Card, Heading, Input, Label, Muted, Row, Screen } from '@/components/ui';
import { BUDDIES, depthFor } from '@/game/tiers';
import { liveStreak, progressStore, setBuddy, setPlayerName } from '@/lib/progress';
import { addFriend, deleteAccount, getProfile, updateDisplayName, type Profile } from '@/lib/social';
import { useStore } from '@/lib/storage';
import { backendConfigured } from '@/lib/supabase';
import { C, F, R, S } from '@/theme';

export default function ProfileScreen() {
  const progress = useStore(progressStore);
  const streak = liveStreak(progress);

  return (
    <Screen>
      <View style={styles.statGrid}>
        <Stat icon={<Icon name="flame" size={18} color={C.fuse} filled strokeWidth={1.5} />} value={`${streak}`} label="Current streak" />
        <Stat icon={<Icon name="medal" size={18} color={C.accent} />} value={`${progress.longestStreak}`} label="Longest streak" />
        <Stat icon={<Icon name="arrowDown" size={18} color={C.accent} strokeWidth={2.6} />} value={`${depthFor(progress.bestScore).toLocaleString()} m`} label="Deepest dig" />
        <Stat icon={<Gem tier="diamond" size={18} />} value={`${progress.gems}`} label="Gems found" />
        <Stat icon={<Icon name="pickaxe" size={18} color={C.muted} />} value={`${progress.digsPlayed}`} label="Digs played" />
        <Stat icon={<Icon name="calendar" size={18} color={C.muted} />} value={`${Object.keys(progress.daily).length}`} label="Dailies played" />
      </View>

      <Card>
        <Label>Buddies</Label>
        <Muted>Unlocked by your longest daily streak. Tap to bring one along.</Muted>
        <View style={styles.buddies}>
          {BUDDIES.map((b) => {
            const unlocked = progress.longestStreak >= b.streak;
            const selected = progress.buddy === b.id;
            return (
              <Pressable
                key={b.id}
                disabled={!unlocked}
                onPress={() => setBuddy(b.id)}
                style={[styles.buddy, selected && styles.buddySelected, !unlocked && styles.locked]}>
                <View style={styles.buddyCircle}>
                  {unlocked ? <Text style={styles.buddyEmoji}>{b.emoji}</Text> : <Icon name="lock" size={20} color={C.faint} />}
                </View>
                <Text style={styles.buddyName}>{b.name}</Text>
                {!unlocked && <Muted style={styles.small}>{b.streak}-day streak</Muted>}
              </Pressable>
            );
          })}
        </View>
      </Card>

      {backendConfigured ? (
        <OnlineAccount />
      ) : (
        <Card>
          <Heading>Friends</Heading>
          <Muted>Online features (friends, leaderboards, TNT Toss online) need the backend configured.</Muted>
        </Card>
      )}
      {!backendConfigured && <LocalName name={progress.playerName} />}
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Row style={styles.statRow}>
        {icon}
        <Text style={styles.statValue}>{value}</Text>
      </Row>
      <Muted style={styles.small}>{label}</Muted>
    </View>
  );
}

function LocalName({ name }: { name: string }) {
  const [draft, setDraft] = useState(name);
  return (
    <Card>
      <Heading>Your name</Heading>
      <Input
        value={draft}
        onChangeText={setDraft}
        onEndEditing={() => setPlayerName(draft)}
        placeholder="Miner name"
        maxLength={20}
      />
    </Card>
  );
}

function OnlineAccount() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p);
        setName(p.display_name);
        setPlayerName(p.display_name);
      })
      .catch((e) => setError(e?.message ?? 'Could not load your profile.'));
  }, []);

  if (error) {
    return (
      <Card>
        <Muted>Online profile unavailable: {error}</Muted>
      </Card>
    );
  }
  if (!profile) {
    return (
      <Card>
        <Muted>Loading your miner profile…</Muted>
      </Card>
    );
  }

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === profile.display_name) return;
    try {
      await updateDisplayName(trimmed);
      setPlayerName(trimmed);
      setProfile({ ...profile, display_name: trimmed });
    } catch (e: any) {
      Alert.alert('Could not save name', e?.message ?? '');
    }
  };

  const add = async () => {
    setBusy(true);
    try {
      await addFriend(code);
      setCode('');
      Alert.alert('Friend added', 'You’ll see each other’s daily digs after you both play.');
    } catch (e: any) {
      Alert.alert('Could not add friend', e?.message ?? '');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete online data?',
      'This removes your miner profile, friends and leaderboard history from our servers. Progress saved on this phone stays.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              setProfile(null);
              setError('Your online data was deleted. Reopen this screen to start fresh.');
            } catch (e: any) {
              Alert.alert('Could not delete', e?.message ?? '');
            }
          },
        },
      ],
    );

  return (
    <>
      <Card>
        <Heading>Your miner</Heading>
        <Input
          value={name}
          onChangeText={setName}
          onEndEditing={saveName}
          placeholder="Miner name"
          maxLength={20}
        />
        <Row style={styles.codeRow}>
          <View style={styles.flex}>
            <Muted>Your friend code</Muted>
            <Text style={styles.code}>{profile.friend_code}</Text>
          </View>
          <Button label="Copy" icon="copy" variant="secondary" onPress={() => Clipboard.setStringAsync(profile.friend_code)} />
        </Row>
      </Card>
      <Card>
        <Heading>Add a friend</Heading>
        <Body>Enter their 6-character code.</Body>
        <Input
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          placeholder="ABC123"
        />
        <Button label="Add friend" icon="plus" onPress={add} loading={busy} disabled={code.length !== 6} />
      </Card>
      <Button label="Delete my online data" variant="danger" onPress={confirmDelete} />
    </>
  );
}

const styles = StyleSheet.create({
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  stat: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderTopColor: C.highlight,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderBottomColor: C.edge,
    borderRadius: R.md,
    padding: S.md,
    alignItems: 'center',
    gap: 2,
  },
  statRow: { gap: 5 },
  statValue: { color: C.text, fontSize: 20, fontFamily: F.display },
  small: { fontSize: 12, textAlign: 'center' },
  buddies: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  buddy: {
    width: 96,
    alignItems: 'center',
    padding: S.sm,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceRaised,
  },
  buddySelected: { borderColor: C.accent, borderWidth: 2 },
  locked: { opacity: 0.5 },
  buddyCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.edge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  buddyEmoji: { fontSize: 28 },
  buddyName: { color: C.text, fontSize: 12, fontFamily: F.semi, textAlign: 'center' },
  codeRow: { marginTop: S.sm },
  flex: { flex: 1 },
  code: { color: C.accent, fontSize: 28, fontFamily: F.display, letterSpacing: 3 },
});
