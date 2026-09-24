import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { IconButton, Pill, Row, T } from '@/components/ui';
import { getAudio, reciters, type ResolvedEntry } from '@/content';
import { useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import { useSettings } from '@/store/settings';
import { radius, space } from '@/theme';

export const RATES = [0.75, 1, 1.25, 1.5];

interface Options {
  entries: ResolvedEntry[];
  index: number;
  counts: number[];
  /** Adds one repetition at `position`; returns the new count. */
  count: (position: number) => number;
  goTo: (index: number) => void;
}

/**
 * Drives playback for the reading page. Each finished playback counts one repetition.
 * Repeat on: replays until the thiker's count is reached. Play-all: moves to the next thiker;
 * on a thiker with no recording it waits for the user to count it by tapping, then resumes.
 */
export function useReaderAudio({ entries, index, counts, count, goTo }: Options) {
  const reciter = useSettings((s) => s.reciter);
  const repeat = useSettings((s) => s.audioRepeat);
  const playAll = useSettings((s) => s.playAll);
  const rate = useSettings((s) => s.playbackRate);

  const [open, setOpen] = useState(false);
  // Whether the user wants audio running; stays true while waiting on a card with no recording.
  const [wantsPlay, setWantsPlay] = useState(false);
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const entry = entries[index];
  const source = entry ? getAudio(reciter, entry.id) : undefined;
  const waiting = open && wantsPlay && !source;

  useEffect(() => {
    player.setPlaybackRate(rate);
  }, [player, rate]);

  // Load the current thiker's recording whenever the card changes (index covers repeated ids).
  useEffect(() => {
    if (!open) return;
    if (!source) {
      player.pause();
      return;
    }
    player.replace(source);
    player.setPlaybackRate(rate);
    if (entry) player.updateLockScreenMetadata({ title: entry.thiker.title, artist: reciters[reciter]?.name });
    if (wantsPlay) player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source, index]);

  const onFinish = useRef(() => {});
  useEffect(() => {
    onFinish.current = () => {
    if (!entry) return;
    const n = count(index);
    if (repeat && n < entry.num) {
      player.seekTo(0).then(() => player.play());
      return;
    }
    if (playAll && index + 1 < entries.length) {
      goTo(index + 1);
      return;
    }
    if (!playAll && n >= entry.num && index + 1 < entries.length) goTo(index + 1);
    setWantsPlay(false);
    };
  });

  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) onFinish.current();
    });
    return () => sub.remove();
  }, [player]);

  const start = () => {
    setOpen(true);
    setWantsPlay(true);
    if (source) {
      if (!open) player.replace(source);
      player.setPlaybackRate(rate);
      player.play();
      player.setActiveForLockScreen(true, { title: entry.thiker.title, artist: reciters[reciter]?.name, albumTitle: 'أذكارنا' });
    }
  };

  const toggle = () => {
    if (status.playing) {
      player.pause();
      setWantsPlay(false);
    } else start();
  };

  const stop = () => {
    player.pause();
    player.clearLockScreenControls();
    setWantsPlay(false);
    setOpen(false);
  };

  const seek = (fraction: number) => {
    if (status.duration) player.seekTo(fraction * status.duration);
  };

  return { open, start, toggle, stop, seek, status, waiting, hasAudio: !!source, counts };
}

export type ReaderAudio = ReturnType<typeof useReaderAudio>;

export function PlayerBar({ audio, index, total, goTo }: {
  audio: ReaderAudio; index: number; total: number; goTo: (i: number) => void;
}) {
  const theme = useTheme();
  const settings = useSettings();
  const [width, setWidth] = useState(1);
  const { status } = audio;
  const progress = status.duration ? status.currentTime / status.duration : 0;
  const nextRate = RATES[(RATES.indexOf(settings.playbackRate) + 1) % RATES.length];

  return (
    <View style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Row style={{ justifyContent: 'space-between' }}>
        {/* Right to left: one/all · previous · play · next · stop */}
        <IconButton
          name={settings.playAll ? 'albums' : 'albums-outline'}
          label={settings.playAll ? 'تشغيل الكل' : 'تشغيل ذكر واحد'}
          color={settings.playAll ? theme.accent : theme.muted}
          onPress={() => settings.set({ playAll: !settings.playAll })}
        />
        <IconButton name="play-skip-forward" label="الذكر السابق" onPress={() => index > 0 && goTo(index - 1)} />
        <IconButton name={status.playing ? 'pause' : 'play'} label={status.playing ? 'إيقاف مؤقت' : 'تشغيل'} filled size={28} onPress={audio.toggle} />
        <IconButton name="play-skip-back" label="الذكر التالي" onPress={() => index + 1 < total && goTo(index + 1)} />
        <IconButton name="stop" label="إيقاف المشغل" color={theme.muted} onPress={audio.stop} />
      </Row>
      <Pressable
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onPress={(e) => audio.seek(1 - e.nativeEvent.locationX / width)}
        style={[styles.track, { backgroundColor: theme.surfaceAlt }]}
        accessibilityLabel="شريط التقدم"
      >
        <View style={[styles.fill, { backgroundColor: theme.accent, width: `${progress * 100}%` }]} />
      </Pressable>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => settings.set({ audioRepeat: !settings.audioRepeat })} hitSlop={8}>
          <Row gap={6}>
            <Ionicons name={settings.audioRepeat ? 'repeat' : 'repeat-outline'} size={18} color={settings.audioRepeat ? theme.accent : theme.muted} />
            <T variant="caption" color={settings.audioRepeat ? theme.accent : theme.muted}>
              تكرار الأذكار المكررة صوتيًا
            </T>
          </Row>
        </Pressable>
        {audio.waiting ? <T variant="caption" muted>لا تسجيل لهذا الذكر — اضغط للعدّ</T> : null}
        <Pill label={`${toArabicDigits(settings.playbackRate)}×`} onPress={() => settings.set({ playbackRate: nextRate })} />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.sm },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row-reverse' },
  fill: { height: 6, borderRadius: 3 },
});
