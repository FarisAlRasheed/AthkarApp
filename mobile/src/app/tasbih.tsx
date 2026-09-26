import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Sheet } from '@/components/Sheet';
import { SkyScreen } from '@/components/Sky';
import { Misbaha, MISBAHA_HEIGHT } from '@/components/tasbih/Misbaha';
import { Button, IconButton, Pill, Press, Row, T } from '@/components/ui';
import { tasbih as content } from '@/content';
import { goBack, useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import { feel } from '@/lib/feel';
import { crossed, stringFor } from '@/lib/misbaha';
import { useTier } from '@/lib/quality';
import { sound, useAmbient } from '@/lib/sound';
import { BEAD_MATERIALS, useSettings, type BeadMaterial } from '@/store/settings';
import { useSkyScene } from '@/store/sky';
import { useTasbih } from '@/store/tasbih';
import { ATHKAR_FONTS, motion, radius, space } from '@/theme';

const phraseById = (id: string) => content.phrases.find((p) => p.id === id);

/** المسبحة — the most satisfying screen in the app (DESIGN_PLAN §7.4). */
export default function Tasbih() {
  useSkyScene({ kind: 'clock', shooting: true });
  const theme = useTheme();
  const tier = useTier();
  const { width } = useWindowDimensions();
  const t = useTasbih();
  const material = useSettings((s) => s.beadMaterial);
  const params = useLocalSearchParams<{ phrase?: string }>();
  useAmbient(useIsFocused());

  const [phraseOpen, setPhraseOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [focus, setFocus] = useState(false);
  const [custom, setCustom] = useState(t.customText);
  const [customTarget, setCustomTarget] = useState('');
  const [finished, setFinished] = useState(false);

  // Opened from a special day's card: count that phrase.
  useEffect(() => {
    const p = params.phrase ? phraseById(params.phrase) : undefined;
    if (p && p.id !== useTasbih.getState().phraseId) useTasbih.getState().set({ phraseId: p.id, target: p.target, count: 0, sequenceId: null, step: 0 });
    sound.prepare('tasbih');
  }, [params.phrase]);

  // Focus mode keeps the screen on.
  useEffect(() => {
    if (!focus) return;
    activateKeepAwakeAsync('tasbih').catch(() => {});
    return () => {
      deactivateKeepAwake('tasbih').catch(() => {});
    };
  }, [focus]);

  const sequence = t.sequenceId ? content.sequences.find((s) => s.id === t.sequenceId) : undefined;
  const step = sequence?.steps[t.step];
  const phraseId = step?.phrase ?? t.phraseId;
  const target = step ? step.count : t.target;
  const text = phraseId === 'custom' ? t.customText || '…' : phraseById(phraseId)?.text ?? '';
  const string = useMemo(() => stringFor(target), [target]);

  const pull = useSharedValue(0);
  const wave = useSharedValue(0);
  const kick = useSharedValue(0);
  const pop = useSharedValue(1);
  const glow = useSharedValue(0);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));

  const onTap = () => {
    if (finished) return;
    const n = useTasbih.getState().tap();
    const round = !!target && n % target === 0;
    const piece = crossed(n, stringFor(target));
    if (round) {
      feel.round();
      sound.bead('imam');
    } else if (piece !== 'bead') {
      feel.separator();
      sound.bead(piece);
    } else {
      feel.bead();
      sound.bead('bead');
    }
    if (tier !== 'still') {
      pop.set(withSequence(withTiming(1.03, { duration: 70 }), withSpring(1, motion.spring.settle)));
      if (tier === 'full') kick.set(withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 420, easing: motion.easing.enter })));
    }
    if (round) {
      if (tier === 'full') {
        wave.set(0);
        wave.set(withTiming(1, { duration: 900, easing: motion.easing.drift }));
      }
      if (tier !== 'still') glow.set(withSequence(withTiming(1, { duration: 200 }), withTiming(0, { duration: 700 })));
      if (sequence) advanceSequence();
    }
  };

  /** After a step of تسبيح دبر الصلاة, the next phrase rises in; after the last, a quiet ending. */
  const advanceSequence = () => {
    if (!sequence) return;
    const next = t.step + 1;
    setTimeout(() => {
      if (next < sequence.steps.length) useTasbih.getState().set({ step: next, count: 0 });
      else setFinished(true);
    }, 700);
  };

  const endSequence = () => {
    setFinished(false);
    useTasbih.getState().set({ sequenceId: null, step: 0, count: 0 });
  };

  // The gesture is built once and calls the latest tap handler through a ref.
  const latest = useRef(onTap);
  useEffect(() => {
    latest.current = onTap;
  });
  const callTap = useCallback(() => latest.current(), []);

  // Dragging a bead leftwards by one bead-width counts it — a shortcut for the tap.
  /* eslint-disable react-hooks/refs -- gesture callbacks run on touch events, never during render */
  const gesture = useMemo(() => {
    const tap = Gesture.Tap().maxDistance(12).onEnd((_e, ok) => {
      if (ok) scheduleOnRN(callTap);
    });
    const drag = Gesture.Pan().activeOffsetX([-14, 14]).failOffsetY([-20, 20])
      .onChange((e) => {
        pull.set(Math.max(0, Math.min(1, -e.translationX / 70)));
      })
      .onEnd(() => {
        if (pull.get() > 0.5) {
          pull.set(0);
          scheduleOnRN(callTap);
        } else pull.set(withSpring(0, motion.spring.settle));
      });
    return Gesture.Race(drag, tap);
  }, [pull, callTap]);
  /* eslint-enable react-hooks/refs */

  const reset = () => {
    const doReset = () => {
      setFinished(false);
      useTasbih.getState().set({ count: 0, step: 0 });
    };
    if (t.count < 34) return doReset();
    Alert.alert('تصفير العداد؟', `العدد الحالي ${toArabicDigits(t.count)}`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تصفير', style: 'destructive', onPress: doReset },
    ]);
  };

  const rounds = target ? Math.floor(t.count / target) : 0;
  // Right after finishing a round, keep showing the full target until the next tap.
  const justFinished = !!target && t.count > 0 && t.count % target === 0;
  const shown = !target ? t.count : justFinished ? target : t.count % target;

  return (
    <SkyScreen>
      <Row style={styles.topbar}>
        <IconButton name="chevron-forward" label="رجوع" onPress={() => goBack()} />
        <T variant="title" center style={{ flex: 1, fontSize: 22, lineHeight: 36 }}>المسبحة</T>
        <IconButton name="refresh" label="تصفير" onPress={reset} color={theme.muted} />
      </Row>

      <Pressable onPress={() => setPhraseOpen(true)} style={styles.phrase} accessibilityRole="button" accessibilityHint="تغيير الذكر">
        {sequence ? (
          <Row gap={6} style={{ justifyContent: 'center' }}>
            <T variant="caption" muted>{sequence.title}</T>
            {sequence.steps.map((_, i) => (
              <View key={i} style={[styles.stepDot, { backgroundColor: i < t.step || finished ? theme.accent : i === t.step ? theme.text : theme.border }]} />
            ))}
          </Row>
        ) : null}
        <Animated.View key={`${phraseId}-${t.step}`} entering={FadeInDown.duration(motion.duration.base).easing(motion.easing.enter)} exiting={FadeOutUp.duration(motion.duration.quick)}>
          <Animated.View style={[styles.phraseGlow, { backgroundColor: theme.glow }, glowStyle]} />
          <T variant="title" center style={{ fontFamily: ATHKAR_FONTS.naskh.family, fontSize: text.length > 40 ? 22 : 30, lineHeight: text.length > 40 ? 44 : 56 }}>{text}</T>
        </Animated.View>
      </Pressable>

      <GestureDetector gesture={gesture}>
        <View style={styles.tapArea} collapsable={false} accessibilityRole="button" accessibilityLabel={`سبّح، العدد ${t.count}`}>
          {finished ? (
            <Animated.View entering={FadeIn.duration(motion.duration.calm)} style={styles.counter}>
              <T variant="title" center style={{ fontSize: 34, lineHeight: 56 }}>تقبّل الله</T>
              <T muted center>{`أتممت ${sequence?.title ?? ''}`}</T>
              <View style={{ marginTop: space.md }}><Button label="حسنًا" kind="secondary" onPress={endSequence} /></View>
            </Animated.View>
          ) : (
            <View style={styles.counter}>
              <Animated.View style={popStyle}>
                {t.count === 0 ? (
                  <T variant="title" center color={theme.muted} style={{ fontSize: 44, lineHeight: 96 }}>ابدأ</T>
                ) : (
                  <T variant="display" center style={{ fontSize: 76, lineHeight: 96 }} color={justFinished ? theme.success : undefined}>
                    {toArabicDigits(shown)}
                  </T>
                )}
              </Animated.View>
              <T muted center>{target ? `من ${toArabicDigits(target)}` : 'بلا حدّ'}</T>
              {rounds && !sequence ? <T variant="caption" muted center>{`أتممت ${toArabicDigits(rounds)} × ${toArabicDigits(target!)}`}</T> : null}
            </View>
          )}
          <Misbaha string={string} count={t.count} pull={pull} wave={wave} kick={kick} material={material} tier={tier} width={width} />
          <T variant="caption" muted center style={{ marginTop: space.xs }}>اضغط في أي مكان للتسبيح</T>
        </View>
      </GestureDetector>

      <View style={styles.bottom}>
        {!sequence ? (
          <Row style={{ justifyContent: 'center', flexWrap: 'wrap' }} gap={space.sm}>
            {[...content.targets.map((n) => ({ label: toArabicDigits(n), value: n as number | null })), { label: 'بلا حد', value: null }].map((o) => (
              <Pill key={o.label} label={o.label} active={t.target === o.value} onPress={() => useTasbih.getState().set({ target: o.value })} />
            ))}
            <Pill
              label={t.target && !content.targets.includes(t.target) ? `${toArabicDigits(t.target)} ✎` : 'مخصص'}
              active={!!t.target && !content.targets.includes(t.target)}
              onPress={() => setTargetOpen(true)}
            />
          </Row>
        ) : null}
        <Row style={{ justifyContent: 'center' }} gap={space.xl}>
          <IconButton name="ellipse-outline" label="حبات المسبحة" onPress={() => setMaterialOpen(true)} color={theme.muted} />
          <IconButton name="eye-off-outline" label="وضع التركيز" onPress={() => setFocus(true)} color={theme.muted} />
        </Row>
      </View>

      {focus ? (
        <Animated.View entering={FadeIn.duration(motion.duration.calm)} exiting={FadeOut.duration(motion.duration.quick)} style={[StyleSheet.absoluteFill, styles.focus]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onTap} accessibilityRole="button" accessibilityLabel={`سبّح، العدد ${t.count}`} />
          <Press onPress={() => setFocus(false)} style={styles.focusEnd} accessibilityLabel="إنهاء وضع التركيز">
            <T muted color="rgba(255,255,255,0.4)">إنهاء</T>
          </Press>
          <View pointerEvents="none" style={styles.focusCount}>
            <T variant="display" center color="rgba(255,255,255,0.22)" style={{ fontSize: 56, lineHeight: 72 }}>{toArabicDigits(shown)}</T>
          </View>
        </Animated.View>
      ) : null}

      <Sheet visible={phraseOpen} onClose={() => setPhraseOpen(false)} title="اختر الذكر">
        {content.sequences.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => {
              setFinished(false);
              useTasbih.getState().set({ sequenceId: s.id, step: 0, count: 0 });
              setPhraseOpen(false);
            }}
            style={[styles.option, { backgroundColor: theme.surfaceAlt }]}
          >
            <T variant="heading">{s.title}</T>
            <T variant="caption" muted>{s.steps.map((st) => `${phraseById(st.phrase)?.text.split('،')[0]} ×${toArabicDigits(st.count)}`).join(' · ')}</T>
          </Pressable>
        ))}
        {content.phrases.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => {
              useTasbih.getState().set({ phraseId: p.id, target: p.target, count: 0, sequenceId: null, step: 0 });
              setFinished(false);
              setPhraseOpen(false);
            }}
            style={[styles.option, !sequence && t.phraseId === p.id && { backgroundColor: theme.surfaceAlt }]}
          >
            <T style={{ fontFamily: ATHKAR_FONTS.naskh.family, fontSize: 20, lineHeight: 38 }}>{p.text}</T>
          </Pressable>
        ))}
        <T variant="caption" muted>ذكر مخصص</T>
        <TextInput
          value={custom}
          onChangeText={setCustom}
          placeholder="اكتب الذكر…"
          placeholderTextColor={theme.muted}
          style={[styles.input, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
        />
        <Button
          label="استخدام الذكر المخصص"
          kind="secondary"
          onPress={() => {
            if (!custom.trim()) return;
            useTasbih.getState().set({ phraseId: 'custom', customText: custom.trim(), count: 0, sequenceId: null, step: 0 });
            setPhraseOpen(false);
          }}
        />
      </Sheet>

      <Sheet visible={targetOpen} onClose={() => setTargetOpen(false)} title="عدد مخصص">
        <TextInput
          value={customTarget}
          onChangeText={(v) => setCustomTarget(v.replace(/[^0-9٠-٩]/g, ''))}
          keyboardType="number-pad"
          placeholder="مثال: ٥٠٠"
          placeholderTextColor={theme.muted}
          style={[styles.input, { backgroundColor: theme.surfaceAlt, color: theme.text }]}
        />
        <Button
          label="حفظ"
          onPress={() => {
            const n = parseInt(customTarget.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))), 10);
            if (n > 0) useTasbih.getState().set({ target: n });
            setTargetOpen(false);
          }}
        />
      </Sheet>

      <Sheet visible={materialOpen} onClose={() => setMaterialOpen(false)} title="حبات المسبحة">
        <Row style={{ flexWrap: 'wrap' }}>
          {(Object.keys(BEAD_MATERIALS) as BeadMaterial[]).map((m) => (
            <Pill key={m} label={BEAD_MATERIALS[m]} active={material === m} onPress={() => useSettings.getState().set({ beadMaterial: m })} />
          ))}
        </Row>
        <View style={{ height: MISBAHA_HEIGHT, borderRadius: radius.md, overflow: 'hidden' }}>
          <Misbaha string={string} count={t.count} pull={pull} wave={wave} kick={kick} material={material} tier={tier} width={width - space.lg * 2} />
        </View>
      </Sheet>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  topbar: { paddingHorizontal: space.sm, paddingTop: space.xs },
  phrase: { paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.xs, minHeight: 110, justifyContent: 'center' },
  phraseGlow: { position: 'absolute', left: '10%', right: '10%', top: '10%', bottom: '10%', borderRadius: 999 },
  stepDot: { width: 7, height: 7, borderRadius: 4 },
  tapArea: { flex: 1, justifyContent: 'center' },
  counter: { alignItems: 'center', justifyContent: 'center', gap: space.xs, marginBottom: space.md },
  bottom: { padding: space.lg, gap: space.sm },
  option: { paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.sm, gap: 2 },
  input: { borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.md, fontSize: 18, textAlign: 'right' },
  focus: { backgroundColor: 'rgba(0,0,0,0.92)' },
  focusEnd: { position: 'absolute', top: 56, alignSelf: 'center', padding: space.md },
  focusCount: { position: 'absolute', left: 0, right: 0, bottom: 120 },
});
