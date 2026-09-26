import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut } from 'react-native-reanimated';
import { Khatam } from '@/components/Khatam';
import { SkyScreen } from '@/components/Sky';
import { Button, Press, Row, T } from '@/components/ui';
import { booksFor, getEntries, manifest } from '@/content';
import { useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import { locateMe } from '@/lib/location';
import { useSettings } from '@/store/settings';
import { useSkyScene } from '@/store/sky';
import { motion, radius, space } from '@/theme';

/** A book's short description on its onboarding card (DESIGN_PLAN §7.1). */
const BOOK_NOTES: Record<string, string> = {
  baz: 'مختصرة وميسّرة',
  uthaymeen: 'أوسع وأشمل',
};

/**
 * First launch only (DESIGN_PLAN §7.1): a welcome, the scholar whose selection to follow, and the
 * location for prayer times. Each step can be changed later in the settings.
 */
export default function Onboarding() {
  useSkyScene({ kind: 'clock' });
  const [step, setStep] = useState(0);
  const finish = (next: '/' | '/prayer' = '/') => {
    useSettings.getState().set({ onboarded: true });
    router.replace('/');
    if (next === '/prayer') router.push('/prayer');
  };

  return (
    <SkyScreen>
      <Dots step={step} />
      <Animated.View key={step} entering={FadeInUp.duration(motion.duration.calm).easing(motion.easing.enter)} exiting={FadeOut.duration(150)} style={styles.body}>
        {step === 0 ? <Welcome onNext={() => setStep(1)} /> : step === 1 ? <ChooseBook onNext={() => setStep(2)} /> : <ChooseLocation onDone={finish} />}
      </Animated.View>
    </SkyScreen>
  );
}

function Dots({ step }: { step: number }) {
  const theme = useTheme();
  return (
    <Row gap={6} style={{ justifyContent: 'center', paddingTop: space.lg }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i === step ? theme.text : theme.border, width: i === step ? 18 : 6 }]} />
      ))}
    </Row>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <Khatam size={112} color={theme.glow} strokeWidth={1.4} draw duration={1400} />
      <Animated.View entering={FadeIn.delay(500).duration(motion.duration.calm)} style={{ alignItems: 'center', gap: space.sm }}>
        <T variant="title" center style={{ fontSize: 40, lineHeight: 64 }}>أذكارنا</T>
        <T muted center style={{ fontSize: 17 }}>أذكار الصباح والمساء والنوم، في وقتها.</T>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(1100).duration(motion.duration.calm)} style={styles.bottom}>
        <Button label="ابدأ" onPress={onNext} />
      </Animated.View>
    </View>
  );
}

function ChooseBook({ onNext }: { onNext: () => void }) {
  const theme = useTheme();
  const books = booksFor('morning');
  const chosen = useSettings((s) => s.bookByCollection.morning) ?? manifest.defaultBook;
  const choose = (id: string) => {
    const s = useSettings.getState();
    s.setBook('morning', id);
    s.setBook('evening', id);
  };
  return (
    <View style={styles.page}>
      <View style={{ gap: space.xs }}>
        <T variant="title" style={{ fontSize: 30, lineHeight: 50 }}>اختر كتاب الأذكار</T>
        <T muted>لكل عالِمٍ اختياره وترتيبه لأذكار الصباح والمساء. يمكنك تغييره لاحقًا من الإعدادات.</T>
      </View>
      <View style={{ gap: space.md }}>
        {books.map((b) => {
          const active = chosen === b.id;
          const counts = `${toArabicDigits(getEntries('morning', b.id).length)} ذكرًا للصباح · ${toArabicDigits(getEntries('evening', b.id).length)} للمساء`;
          return (
            <Press
              key={b.id}
              onPress={() => choose(b.id)}
              depth={motion.press.card}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.choice, { backgroundColor: theme.glass, borderColor: active ? theme.accent : theme.border, borderWidth: active ? 2 : StyleSheet.hairlineWidth }]}
            >
              <Row gap={space.md}>
                <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? theme.accent : theme.muted} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="heading" style={{ fontSize: 19 }}>{b.name}</T>
                  {BOOK_NOTES[b.id] ? <T muted>{BOOK_NOTES[b.id]}</T> : null}
                  <T variant="caption" muted>{counts}</T>
                </View>
              </Row>
            </Press>
          );
        })}
      </View>
      <View style={styles.bottom}>
        <Button label="التالي" onPress={onNext} />
      </View>
    </View>
  );
}

function ChooseLocation({ onDone }: { onDone: (next?: '/' | '/prayer') => void }) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const locate = async () => {
    setBusy(true);
    setMessage('');
    const r = await locateMe();
    setBusy(false);
    if (r.ok) onDone();
    else setMessage(r.message);
  };
  return (
    <View style={styles.page}>
      <View style={{ gap: space.md }}>
        <Ionicons name="location-outline" size={40} color={theme.accent} style={{ alignSelf: 'flex-end' }} />
        <T variant="title" style={{ fontSize: 30, lineHeight: 50 }}>مواقيت الصلاة</T>
        <T muted style={{ lineHeight: 26 }}>
          تُحسب مواقيت الصلاة على جهازك من موقعك، دون إنترنت، ليقترح التطبيق الأذكار المناسبة لوقتك. لا يُرسل موقعك إلى أي جهة، ولا يُحفظ إلا على جهازك.
        </T>
        {message ? <T color={theme.text}>{message}</T> : null}
      </View>
      <View style={[styles.bottom, { gap: space.md }]}>
        {busy ? <ActivityIndicator color={theme.accent} /> : <Button label="استخدام موقعي" icon="navigate-outline" onPress={locate} />}
        <Button label="اختيار مدينة" kind="secondary" icon="business-outline" onPress={() => onDone('/prayer')} />
        <Press onPress={() => onDone()} accessibilityRole="button" style={{ alignItems: 'center', padding: space.sm }}>
          <T muted>لاحقًا</T>
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.xl },
  page: { flex: 1, padding: space.xl, gap: space.xl, justifyContent: 'center' },
  bottom: { alignSelf: 'stretch', marginTop: space.lg },
  choice: { borderRadius: radius.lg, padding: space.lg },
  dot: { height: 6, borderRadius: 3 },
});
