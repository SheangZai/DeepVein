import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { Panel, TntScreen } from '@/components/tnt-arena';
import { TntTitle } from '@/components/tnt-lobby';
import { Input, Row } from '@/components/ui';
import { MAX_PLAYERS } from '@/game/tnt';
import { BUDDIES } from '@/game/tiers';
import { bestOpenRoom, newRoomCode, usePublicRooms } from '@/hooks/use-online-room';
import { progressStore, setBuddy, setPlayerName } from '@/lib/progress';
import { useStore } from '@/lib/storage';
import { backendConfigured } from '@/lib/supabase';
import { C, F, R, S } from '@/theme';

export default function PartyHome() {
  const progress = useStore(progressStore);
  const rooms = usePublicRooms();
  const [name, setName] = useState(progress.playerName);
  const [code, setCode] = useState('');
  const ready = name.trim().length > 0;

  const go = (roomCode: string, isPublic: boolean) => {
    setPlayerName(name.trim());
    router.push({ pathname: '/party/[code]', params: { code: roomCode, public: isPublic ? '1' : '0' } });
  };

  const quickPlay = () => go(bestOpenRoom(rooms ?? [])?.code ?? newRoomCode(), true);

  return (
    <TntScreen>
      <TntTitle />
      <Text style={styles.intro}>
        Name an answer that fits the category to pass the lit TNT. Wrong? Keep trying until the fuse runs out.
        No repeats, and the fuse gets shorter every pass. Last miner standing wins.
      </Text>

      <Panel title="WHO’S PLAYING" action={{ label: 'HOW TO PLAY', onPress: () => router.push('/how-to') }}>
        <Text style={styles.fieldLabel}>YOUR NAME</Text>
        <Input
          value={name}
          onChangeText={setName}
          onEndEditing={() => setPlayerName(name.trim())}
          placeholder="Miner name"
          maxLength={20}
        />
        <View style={styles.buddies}>
          {BUDDIES.map((b) => {
            const unlocked = progress.longestStreak >= b.streak;
            const selected = progress.buddy === b.id;
            return (
              <Pressable
                key={b.id}
                disabled={!unlocked}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: !unlocked }}
                accessibilityLabel={unlocked ? b.name : `${b.name}, unlocks at a ${b.streak}-day streak`}
                onPress={() => setBuddy(b.id)}
                style={[styles.buddy, selected && styles.buddySelected]}>
                <Text style={[styles.buddyEmoji, !unlocked && styles.buddyLocked]}>{b.emoji}</Text>
                <Text numberOfLines={1} style={[styles.buddyName, selected && { color: C.accent }]}>
                  {b.name.split(' ').pop()!.toUpperCase()}
                </Text>
                {!unlocked && <Text style={styles.buddyReq}>{b.streak}-day</Text>}
              </Pressable>
            );
          })}
        </View>
      </Panel>

      <Panel title="PLAY NOW">
        {backendConfigured && (
          <>
            <Row style={styles.bigRow}>
              <BigButton icon="globe" label="QUICK PLAY" hint="join an open room" onPress={quickPlay} disabled={!ready} hot />
              <BigButton
                icon="lock"
                label="PRIVATE"
                hint="invite with a code"
                onPress={() => go(newRoomCode(), false)}
                disabled={!ready}
              />
            </Row>
            <Row>
              <Input
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z]/g, ''))}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={4}
                placeholder="ROOM CODE"
                style={[styles.flex, styles.codeInput]}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!ready || code.length !== 4}
                onPress={() => go(code, false)}
                style={[styles.join, (!ready || code.length !== 4) && styles.off]}>
                <Text style={styles.joinText}>JOIN</Text>
              </Pressable>
            </Row>
          </>
        )}
        <BigButton icon="phone" label="PASS & PLAY" hint="one phone, offline" onPress={() => router.push('/party/local')} />
        {!ready && <Text style={styles.hint}>Enter a name to play online.</Text>}
      </Panel>

      {backendConfigured ? (
        <Panel title={`PUBLIC ROOMS${rooms ? ` · ${rooms.length}` : ''}`}>
          {rooms === null ? (
            <ActivityIndicator color={C.accent} style={styles.loading} />
          ) : rooms.length === 0 ? (
            <Text style={styles.hint}>No public rooms right now. Quick play starts one.</Text>
          ) : (
            rooms.map((r) => {
              const open = r.phase === 'lobby' && r.count < MAX_PLAYERS;
              return (
                <Pressable
                  key={r.code}
                  disabled={!ready}
                  onPress={() => go(r.code, true)}
                  style={({ pressed }) => [styles.room, pressed && styles.pressed]}>
                  <Text style={styles.roomCode}>{r.code}</Text>
                  <View style={styles.flex}>
                    <Text numberOfLines={1} style={styles.roomHost}>
                      {r.host ?? 'Miner'}
                    </Text>
                    <Text style={[styles.roomMeta, !open && { color: C.fuse }]}>
                      {r.count}/{MAX_PLAYERS} · {r.phase === 'lobby' ? (open ? 'IN THE LOBBY' : 'FULL') : 'PLAYING'}
                    </Text>
                  </View>
                  <Text style={styles.roomJoin}>{open ? 'JOIN ▸' : 'WATCH ▸'}</Text>
                </Pressable>
              );
            })
          )}
        </Panel>
      ) : (
        <Text style={styles.hint}>Online rooms need the backend configured. Pass & Play works offline.</Text>
      )}
    </TntScreen>
  );
}

function BigButton({
  icon,
  label,
  hint,
  onPress,
  disabled,
  hot,
}: {
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
  hot?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.big, hot && styles.bigHot, disabled && styles.off, pressed && styles.bigPressed]}>
      <Row style={styles.bigInner}>
        <Icon name={icon} size={18} color={hot ? C.accent : C.text} strokeWidth={2.4} />
        <Text style={[styles.bigLabel, hot && { color: C.accent }]}>{label}</Text>
      </Row>
      <Text style={styles.bigHint}>{hint}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { color: C.text, opacity: 0.85, fontFamily: F.regular, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  fieldLabel: { color: C.muted, fontFamily: F.bold, fontSize: 10, letterSpacing: 2.5 },
  buddies: { flexDirection: 'row', gap: 6 },
  buddy: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: S.sm,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.edge,
    gap: 2,
  },
  buddySelected: { borderColor: C.accent, borderWidth: 2, backgroundColor: 'rgba(255,193,69,0.08)' },
  buddyEmoji: { fontSize: 24 },
  buddyLocked: { opacity: 0.25 },
  buddyName: { color: C.text, fontFamily: F.bold, fontSize: 9, letterSpacing: 1 },
  buddyReq: { color: C.faint, fontFamily: F.medium, fontSize: 9 },
  bigRow: { gap: S.sm },
  big: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: S.md,
    borderRadius: R.sm,
    borderWidth: 2,
    borderColor: C.border,
    borderBottomWidth: 4,
    borderBottomColor: C.edge,
    backgroundColor: 'rgba(30,20,14,0.95)',
  },
  bigHot: { borderColor: C.accent, borderBottomColor: C.accentEdge },
  bigPressed: { borderBottomWidth: 2, marginTop: 2 },
  bigInner: { gap: 6 },
  bigLabel: { color: C.text, fontFamily: F.heavy, fontSize: 15, letterSpacing: 2.5 },
  bigHint: { color: C.muted, fontFamily: F.regular, fontSize: 11 },
  off: { opacity: 0.4 },
  codeInput: { letterSpacing: 6, fontFamily: F.display, fontSize: 20, paddingVertical: S.sm + 2 },
  join: {
    height: 50,
    paddingHorizontal: S.lg,
    borderRadius: R.md,
    backgroundColor: C.danger,
    borderBottomWidth: 4,
    borderBottomColor: '#a3283a',
    justifyContent: 'center',
  },
  joinText: { color: C.text, fontFamily: F.heavy, fontSize: 14, letterSpacing: 2.5 },
  hint: { color: C.muted, fontFamily: F.regular, fontSize: 13, textAlign: 'center' },
  loading: { paddingVertical: S.md },
  room: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: S.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  pressed: { opacity: 0.6 },
  roomCode: { color: C.accent, fontFamily: F.display, fontSize: 24, letterSpacing: 3, width: 84 },
  roomHost: { color: C.text, fontFamily: F.semi, fontSize: 14 },
  roomMeta: { color: C.muted, fontFamily: F.bold, fontSize: 10, letterSpacing: 1.5, marginTop: 2 },
  roomJoin: { color: C.danger, fontFamily: F.heavy, fontSize: 12, letterSpacing: 2 },
});
