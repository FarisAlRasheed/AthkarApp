import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SkyScreen } from '@/components/Sky';
import { Sheet } from '@/components/Sheet';
import { Button, IconButton, Pill, Row, T } from '@/components/ui';
import { tasbih as content } from '@/content';
import { goBack, useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import { useTasbih } from '@/store/tasbih';
import { fonts, radius, space, type Theme } from '@/theme';

const BEADS = 11;
const SPACING = 44;
const BEAD = 30;
const SAG = 0.0009; // how much the string hangs

export default function Tasbih() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const t = useTasbih();
  const phrase = content.phrases.find((p) => p.id === t.phraseId);
  const text = t.phraseId === 'custom' ? t.customText || '…' : phrase?.text ?? '';

  const [phraseOpen, setPhraseOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [custom, setCustom] = useState(t.customText);
  const [customTarget, setCustomTarget] = useState('');

  // Beads live on a loop; `shift` grows by one spacing per tap and springs to its target,
  // so rapid taps queue smoothly instead of jumping.
  const shift = useSharedValue(t.count * SPACING);
  const pulse = useSharedValue(0);
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  useEffect(() => {
    shift.set(withSpring(t.count * SPACING, { damping: 14, stiffness: 180, mass: 0.6 }));
  }, [t.count, shift]);

  const onTap = () => {
    const n = t.tap();
    pop.set(withSequence(withTiming(1.1, { duration: 70 }), withSpring(1, { damping: 10, stiffness: 260 })));
    if (t.target && n % t.target === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pulse.set(withSequence(withTiming(1, { duration: 180 }), withTiming(0, { duration: 700 })));
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    }
  };

  const reset = () => {
    const doReset = () => t.set({ count: 0 });
    if (t.count < 34) return doReset();
    Alert.alert('تصفير العداد؟', `العدد الحالي ${toArabicDigits(t.count)}`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تصفير', style: 'destructive', onPress: doReset },
    ]);
  };

  const rounds = t.target ? Math.floor(t.count / t.target) : 0;
  // Right after finishing a round, keep showing the full target until the next tap.
  const justFinished = !!t.target && t.count > 0 && t.count % t.target === 0;
  const shown = !t.target ? t.count : justFinished ? t.target : t.count % t.target;
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value * 0.35,
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.8, 1.15]) }],
  }));

  return (
    <SkyScreen>
      <Row style={styles.topbar}>
        <IconButton name="chevron-forward" label="رجوع" onPress={() => goBack()} />
        <T variant="title" center style={{ flex: 1, fontSize: 22, lineHeight: 36 }}>المسبحة</T>
        <IconButton name="refresh" label="تصفير" onPress={reset} color={theme.muted} />
      </Row>

      <Pressable onPress={() => setPhraseOpen(true)} style={styles.phrase} accessibilityHint="تغيير الذكر">
        <T variant="title" center style={{ fontFamily: fonts.athkar, fontSize: 32, lineHeight: 60 }}>{text}</T>
        <T variant="caption" muted center>اضغط لتغيير الذكر</T>
      </Pressable>

      <Pressable onPress={onTap} style={styles.tapArea} accessibilityRole="button" accessibilityLabel={`سبّح، العدد ${t.count}`}>
        <View style={styles.counter}>
          <Animated.View style={[styles.pulse, { backgroundColor: theme.accent }, pulseStyle]} />
          <Animated.View style={popStyle}>
            <T variant="display" center style={{ fontSize: 76, lineHeight: 96 }} color={justFinished ? theme.success : undefined}>
              {toArabicDigits(shown)}
            </T>
          </Animated.View>
          <T muted center>{t.target ? `من ${toArabicDigits(t.target)}` : 'بلا حدّ'}</T>
          {rounds ? <T variant="caption" muted center>{`أتممت ${toArabicDigits(rounds)} × ${toArabicDigits(t.target!)}`}</T> : null}
        </View>

        <View style={[styles.string, { width }]} pointerEvents="none">
          {Array.from({ length: BEADS }, (_, i) => (
            <Bead key={i} index={i} shift={shift} width={width} theme={theme} />
          ))}
        </View>
        <T variant="caption" muted center style={{ marginTop: space.lg }}>اضغط في أي مكان للتسبيح</T>
      </Pressable>

      <Row style={styles.targets} gap={space.sm}>
        {[...content.targets.map((n) => ({ label: toArabicDigits(n), value: n as number | null })), { label: 'بلا حد', value: null }].map((o) => (
          <Pill key={o.label} label={o.label} active={t.target === o.value} onPress={() => t.set({ target: o.value })} />
        ))}
        <Pill
          label={t.target && !content.targets.includes(t.target) ? `${toArabicDigits(t.target)} ✎` : 'مخصص'}
          active={!!t.target && !content.targets.includes(t.target)}
          onPress={() => setTargetOpen(true)}
        />
      </Row>

      <Sheet visible={phraseOpen} onClose={() => setPhraseOpen(false)} title="اختر الذكر">
        {content.phrases.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => {
              t.set({ phraseId: p.id, target: p.target, count: 0 });
              setPhraseOpen(false);
            }}
            style={[styles.option, t.phraseId === p.id && { backgroundColor: theme.surfaceAlt }]}
          >
            <T style={{ fontFamily: fonts.athkar, fontSize: 20, lineHeight: 38 }}>{p.text}</T>
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
            t.set({ phraseId: 'custom', customText: custom.trim(), count: 0 });
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
            if (n > 0) t.set({ target: n });
            setTargetOpen(false);
          }}
        />
      </Sheet>
    </SkyScreen>
  );
}

function Bead({ index, shift, width, theme }: { index: number; shift: SharedValue<number>; width: number; theme: Theme }) {
  const loop = BEADS * SPACING;
  const style = useAnimatedStyle(() => {
    // Position on the loop, centred on screen; beads leaving one edge re-enter from the other.
    const raw = (index * SPACING + shift.value) % loop;
    const x = raw - loop / 2 + width / 2;
    const fromCentre = x - width / 2;
    const y = SAG * ((width / 2) ** 2 - fromCentre * fromCentre); // lowest in the middle, like a hanging string
    const scale = interpolate(Math.abs(fromCentre), [0, width / 2], [1.25, 0.8], 'clamp');
    return {
      transform: [{ translateX: x - BEAD / 2 }, { translateY: y }, { scale }],
      opacity: interpolate(Math.abs(fromCentre), [width / 2 - 30, width / 2 + 10], [1, 0], 'clamp'),
    };
  });
  // A shine spot and a soft rim give each bead some roundness.
  return (
    <Animated.View style={[styles.bead, { backgroundColor: theme.accent, borderColor: 'rgba(0,0,0,0.18)' }, style]}>
      <View style={styles.shine} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topbar: { paddingHorizontal: space.sm, paddingTop: space.xs },
  phrase: { paddingHorizontal: space.xl, paddingTop: space.md, gap: space.xs },
  tapArea: { flex: 1, justifyContent: 'center' },
  counter: { alignItems: 'center', justifyContent: 'center', gap: space.xs, marginBottom: space.xl },
  pulse: { position: 'absolute', width: 220, height: 220, borderRadius: 110 },
  string: { height: 90, position: 'relative' },
  bead: { position: 'absolute', top: 10, left: 0, width: BEAD, height: BEAD, borderRadius: BEAD / 2, borderWidth: 1.5 },
  shine: { position: 'absolute', top: 5, left: 7, width: 9, height: 6, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)', transform: [{ rotate: '-30deg' }] },
  targets: { justifyContent: 'center', flexWrap: 'wrap', padding: space.lg },
  option: { paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.sm },
  input: { borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.md, fontSize: 18, textAlign: 'right' },
});
