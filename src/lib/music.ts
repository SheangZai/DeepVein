import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import type { TntState } from '@/game/tnt';

import { createStore } from './storage';

/** Device settings. `sound` covers music and effects. */
export const settingsStore = createStore('settings:v1', { sound: true });

export function setSound(sound: boolean) {
  settingsStore.set((s) => ({ ...s, sound }));
}

const CALM_VOLUME = 0.3;
const TENSE_VOLUME = 0.45;
const BOOM_VOLUME = 0.8;
const FADE_MS = 400;

let calm: AudioPlayer | null = null;
let tense: AudioPlayer | null = null;
let boom: AudioPlayer | null = null;
let tension = false;
let foreground = true;
const fades = new Map<AudioPlayer, ReturnType<typeof setInterval>>();

function players() {
  if (!calm) {
    calm = createAudioPlayer(require('@/assets/audio/calm.wav'));
    calm.loop = true;
    calm.volume = 0;
    tense = createAudioPlayer(require('@/assets/audio/tense.wav'));
    tense.loop = true;
    tense.volume = 0;
    boom = createAudioPlayer(require('@/assets/audio/boom.wav'));
    boom.volume = BOOM_VOLUME;
  }
  return { calm: calm!, tense: tense!, boom: boom! };
}

/** Ramps a player's volume, pausing it when it reaches silence. */
function fadeTo(p: AudioPlayer, target: number) {
  clearInterval(fades.get(p));
  if (target > 0 && !p.playing) p.play();
  const from = p.volume;
  const steps = 10;
  let i = 0;
  fades.set(
    p,
    setInterval(() => {
      i++;
      p.volume = from + ((target - from) * i) / steps;
      if (i >= steps) {
        clearInterval(fades.get(p));
        fades.delete(p);
        if (target === 0) p.pause();
      }
    }, FADE_MS / steps),
  );
}

/** Brings playback in line with the sound setting, tension and app state. */
function apply() {
  const on = settingsStore.get().sound && foreground;
  const { calm, tense } = players();
  if (on && tension && tense.volume === 0) tense.seekTo(0);
  fadeTo(calm, on && !tension ? CALM_VOLUME : 0);
  fadeTo(tense, on && tension ? TENSE_VOLUME : 0);
}

let started = false;

/** Starts background music. Call once from the root layout. */
export function startMusic() {
  if (started) return;
  started = true;
  if (Platform.OS !== 'web') {
    // Respect the silent switch and let the player's own music keep playing.
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(
      () => {},
    );
  }
  settingsStore.subscribe(apply);
  AppState.addEventListener('change', (s) => {
    foreground = s === 'active';
    apply();
  });
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    // Browsers only allow sound after the first tap or key press.
    const unlock = () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      apply();
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
  } else {
    apply();
  }
}

/** Switches to the tense loop while `active` (e.g. the fuse is nearly out). */
export function useTension(active: boolean) {
  useEffect(() => {
    if (!started || tension === active) return;
    tension = active;
    apply();
  }, [active]);
  useEffect(
    () => () => {
      if (tension) {
        tension = false;
        apply();
      }
    },
    [],
  );
}

/** Plays the explosion whenever the TNT goes off in this game. */
export function useBoomSound(state: TntState) {
  const e = state.lastEvent;
  const key = e?.kind === 'boom' ? `${state.matchId}:${state.seenPrompts.length}:${e.playerId}` : '';
  useEffect(() => {
    if (!key || !started || !settingsStore.get().sound || !foreground) return;
    const { boom } = players();
    boom.seekTo(0);
    boom.play();
  }, [key]);
}
