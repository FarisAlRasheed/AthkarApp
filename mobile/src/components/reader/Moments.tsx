import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Khatam } from '@/components/Khatam';
import { Button, T } from '@/components/ui';
import { collections } from '@/content';
import { usePrayerTimes, useTheme } from '@/hooks';
import { formatTime } from '@/lib/arabic';
import { feel } from '@/lib/feel';
import { nextTime, PRAYER_LABELS } from '@/lib/prayer';
import type { Tier } from '@/lib/quality';
import { SLEEP_AFTER_ISHA } from '@/lib/schedule';
import { fonts, motion, space } from '@/theme';

/**
 * The opening moment (DESIGN_PLAN §7.3): the collection's title and its verse over a dimmed sky,
 * the first time each day it starts fresh. Long verses stay longer; a tap continues.
 */
export function Opening({ collectionId, onDone }: { collectionId: string; onDone: () => void }) {
  const theme = useTheme();
  const c = collections[collectionId];
  const verse = c.opening?.text ?? '';
  useEffect(() => {
    const t = setTimeout(onDone, Math.min(6000, 1800 + verse.length * 30));
    return () => clearTimeout(t);
  }, [onDone, verse.length]);
  return (
    <Pressable style={styles.fill} onPress={onDone} accessibilityRole="button" accessibilityLabel="متابعة">
      {/* The sky blends into the collection's own sky in 0.7 s; the words wait for it. */}
      <Animated.View entering={FadeIn.delay(300).duration(motion.duration.calm)} style={styles.center}>
        <T variant="title" center style={{ fontSize: 34, lineHeight: 56 }}>{c.title}</T>
        {verse ? (
          <Animated.View entering={FadeInUp.delay(600).duration(motion.duration.calm).easing(motion.easing.enter)}>
            <T center color={theme.text} style={{ fontFamily: fonts.quran, fontSize: 22, lineHeight: 46 }}>{verse}</T>
          </Animated.View>
        ) : null}
        <Animated.View entering={FadeIn.delay(1400).duration(motion.duration.calm)}>
          <T variant="caption" muted center>اضغط للمتابعة</T>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/** Lines under «تقبّل الله منك» (DESIGN_PLAN §12). */
function useEndingLines(collectionId: string): [string, string | null] {
  const { now, today, tomorrow } = usePrayerTimes();
  switch (collectionId) {
    case 'morning':
      return ['أتممت أذكار الصباح', `أذكار المساء بعد العصر (${formatTime(today.asr)})`];
    case 'evening':
      return ['أتممت أذكار المساء', `أذكار النوم بعد العشاء (${formatTime(new Date(today.isha.getTime() + SLEEP_AFTER_ISHA))})`];
    case 'sleep':
      return ['تصبح على خير', 'ونم على شقك الأيمن'];
    default: {
      const next = nextTime(now, today, tomorrow);
      return ['تقبّل الله صلاتك', `${PRAYER_LABELS[next.name]} ${formatTime(next.at)}`];
    }
  }
}

/** The collection's ending: the star draws itself, then the words, then the way on. */
export function Ending({ collectionId, tier, onHome, onRestart }: {
  collectionId: string; tier: Tier; onHome: () => void; onRestart: () => void;
}) {
  const theme = useTheme();
  const [line, next] = useEndingLines(collectionId);
  const still = tier === 'still';
  const at = (ms: number) => (still ? 0 : tier === 'lite' ? ms * 0.6 : ms);
  useEffect(() => {
    feel.collectionComplete();
  }, []);
  return (
    <View style={styles.center}>
      <Khatam size={120} color={theme.glow} strokeWidth={1.4} draw={!still} duration={tier === 'full' ? 1200 : 600} />
      <Animated.View entering={FadeInUp.delay(at(600)).duration(motion.duration.calm).easing(motion.easing.enter)} style={{ alignItems: 'center', gap: space.xs }}>
        <T variant="title" center style={{ fontSize: 34, lineHeight: 56 }}>تقبّل الله منك</T>
        <T center muted>{line}</T>
        {next ? <T variant="caption" center muted>{next}</T> : null}
      </Animated.View>
      <Animated.View entering={FadeIn.delay(at(1400)).duration(motion.duration.calm)} style={styles.buttons}>
        <Button label="العودة للرئيسية" onPress={onHome} />
        <Button label="ابدأ من جديد" kind="secondary" onPress={onRestart} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg },
  buttons: { alignSelf: 'stretch', gap: space.md, marginTop: space.lg },
});
