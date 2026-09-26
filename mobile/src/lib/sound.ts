import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { create } from 'zustand';
import { SOUNDS } from '@/content/sound-index';
import { useClock } from '@/store/clock';
import { useSettings } from '@/store/settings';

/**
 * Every sound effect and the ambience (DESIGN_PLAN §5). All optional, all off by default; the audio
 * mode stays mixWithOthers so nothing here ever stops the user's own audio.
 */

const VOLUME = { low: 0.25, mid: 0.5, high: 0.85 } as const;
const volume = () => VOLUME[useSettings.getState().soundVolume];

/** A few preloaded players per sample, used round-robin so fast taps never cut each other off. */
class Pool {
  private players: AudioPlayer[] = [];
  private next = 0;
  constructor(private sources: number[], private copies = 3) {}
  private load() {
    if (this.players.length || !this.sources.length) return;
    for (let i = 0; i < this.copies; i++) this.players.push(createAudioPlayer(this.sources[i % this.sources.length]));
  }
  prepare() {
    this.load();
  }
  play() {
    this.load();
    const p = this.players[this.next++ % this.players.length];
    if (!p) return;
    p.volume = volume();
    p.seekTo(0).then(() => p.play()).catch(() => {});
  }
  release() {
    this.players.forEach((p) => p.remove());
    this.players = [];
  }
}

const pools = {
  bead: new Pool(SOUNDS.bead, 4),
  separator: new Pool(SOUNDS.separator, 2),
  imam: new Pool(SOUNDS.imam, 1),
  count: new Pool(SOUNDS.count, 3),
};

export const sound = {
  /** Load the tasbih's or the reader's players ahead of the first tap. */
  prepare(kind: 'tasbih' | 'reader') {
    const s = useSettings.getState();
    if (kind === 'tasbih' && s.tasbihSound) [pools.bead, pools.separator, pools.imam].forEach((p) => p.prepare());
    if (kind === 'reader' && s.countSound) pools.count.prepare();
  },
  bead(kind: 'bead' | 'separator' | 'imam' = 'bead') {
    if (useSettings.getState().tasbihSound) pools[kind].play();
  },
  count() {
    if (useSettings.getState().countSound) pools.count.play();
  },
};

/** Whether a recitation is playing; the ambience makes way for it. */
export const useAudioState = create<{ recitation: boolean }>(() => ({ recitation: false }));

export const hasAmbient = () => Object.keys(SOUNDS.ambient).length > 0;

/** Which ambient loop fits: the setting, or the sky's time of day, or whatever exists. */
function ambientKey(): string | null {
  const { ambient } = useSettings.getState();
  if (ambient === 'off') return null;
  const keys = Object.keys(SOUNDS.ambient);
  if (!keys.length) return null;
  if (ambient !== 'auto') return SOUNDS.ambient[ambient] ? ambient : null;
  const theme = useClock.getState().themeId;
  const key = theme === 'fajr' ? 'fajr' : theme;
  return SOUNDS.ambient[key] ? key : (keys.find((k) => k !== 'rain') ?? keys[0]);
}

/**
 * Plays the ambience while `active` (the reader or tasbih is on screen), crossfading over 4 s when
 * the time of day changes and fading out while a recitation plays.
 */
export function useAmbient(active: boolean) {
  const setting = useSettings((s) => s.ambient);
  const level = useSettings((s) => s.soundVolume);
  const theme = useClock((s) => s.themeId);
  const recitation = useAudioState((s) => s.recitation);

  useEffect(() => {
    const key = active && !recitation ? ambientKey() : null;
    if (!key) return;
    const player = createAudioPlayer(SOUNDS.ambient[key]);
    player.loop = true;
    player.volume = 0;
    player.play();
    const target = VOLUME[level] * 0.6;
    let v = 0;
    const fadeIn = setInterval(() => {
      v = Math.min(target, v + target / 40);
      player.volume = v;
      if (v >= target) clearInterval(fadeIn);
    }, 100);
    return () => {
      clearInterval(fadeIn);
      const fadeOut = setInterval(() => {
        v = Math.max(0, v - target / 8);
        player.volume = v;
        if (v <= 0) {
          clearInterval(fadeOut);
          player.remove();
        }
      }, 100);
    };
  }, [active, recitation, setting, level, theme]);
}
