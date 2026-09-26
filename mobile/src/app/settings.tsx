import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { RATES } from '@/components/reader/AudioPlayer';
import { SkyScreen } from '@/components/Sky';
import { Card, IconButton, Pill, Row, T } from '@/components/ui';
import { booksFor, reciters } from '@/content';
import { goBack, useMinute, useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import { formatDateLine } from '@/lib/hijri';
import { METHODS } from '@/lib/prayer';
import { useTier } from '@/lib/quality';
import { hasAmbient } from '@/lib/sound';
import { useProgress } from '@/store/progress';
import { BEAD_MATERIALS, FONT_SIZES, useSettings, type BeadMaterial } from '@/store/settings';
import { useSkyScene } from '@/store/sky';
import { useTasbih } from '@/store/tasbih';
import { ATHKAR_FONTS, motion, space, THEMES, type AthkarFont, type ThemeId } from '@/theme';

/** All settings, grouped (DESIGN_PLAN §7.6). Everything here also works from where it's used. */
export default function Settings() {
  useSkyScene({ kind: 'clock' });
  const theme = useTheme();
  const s = useSettings();
  const tier = useTier();
  const now = useMinute();

  const confirmReset = () =>
    Alert.alert('مسح كل التقدم؟', 'سيُمسح تقدّمك في جميع الأذكار والمسبحة. لا يمكن التراجع.', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'مسح', style: 'destructive',
        onPress: () => {
          useProgress.getState().resetAll();
          useTasbih.getState().set({ count: 0 });
        },
      },
    ]);

  const toggle = (label: string, value: boolean, key: 'haptics' | 'tasbihSound' | 'countSound' | 'audioRepeat' | 'playAll') => (
    <Row style={{ justifyContent: 'space-between' }}>
      <T style={{ flex: 1 }}>{label}</T>
      <Switch value={value} onValueChange={(v) => s.set({ [key]: v })} trackColor={{ true: theme.accent }} accessibilityLabel={label} />
    </Row>
  );

  const tierName = { full: 'كاملة', lite: 'خفيفة', still: 'ثابتة (تقليل الحركة)' }[tier];

  return (
    <SkyScreen>
      <Row style={styles.topbar}>
        <IconButton name="chevron-forward" label="رجوع" onPress={() => goBack()} />
        <T variant="title" center style={{ flex: 1, fontSize: 22, lineHeight: 36 }}>الإعدادات</T>
        <View style={{ width: 44 }} />
      </Row>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.duration(motion.duration.calm).easing(motion.easing.enter)} style={{ gap: styles.content.gap }}>
          <Card onPress={() => router.push('/prayer')}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Heading icon="location-outline" title="الموقع ومواقيت الصلاة" caption={s.place ? `${s.place.name} · ${METHODS[s.place.method]}` : 'لم يُحدَّد بعد'} />
              <Ionicons name="chevron-back" size={20} color={theme.muted} />
            </Row>
          </Card>

          <Card onPress={() => router.push('/notifications')}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Heading icon="notifications-outline" title="الإشعارات" caption="تذكير بالصلوات وبأذكار الصباح والمساء والنوم" />
              <Ionicons name="chevron-back" size={20} color={theme.muted} />
            </Row>
          </Card>

          <Group icon="book-outline" title="الكتاب والقارئ">
            {(['morning', 'evening'] as const).map((c) => {
              const books = booksFor(c);
              if (books.length < 2) return null;
              const active = s.bookByCollection[c] ?? books[0].id;
              return (
                <View key={c} style={{ gap: space.xs }}>
                  <T muted>{c === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'}</T>
                  <Row style={{ flexWrap: 'wrap' }}>
                    {books.map((b) => <Pill key={b.id} label={b.name} active={active === b.id} onPress={() => s.setBook(c, b.id)} />)}
                  </Row>
                </View>
              );
            })}
            <View style={{ gap: space.xs }}>
              <T muted>القارئ</T>
              <Row style={{ flexWrap: 'wrap' }}>
                {Object.entries(reciters).map(([id, r]) => <Pill key={id} label={r.name} active={s.reciter === id} onPress={() => s.set({ reciter: id })} />)}
              </Row>
            </View>
          </Group>

          <Group icon="color-palette-outline" title="المظهر والحركة">
            <T muted>السماء والألوان</T>
            <Row style={{ flexWrap: 'wrap' }}>
              <Pill label="تلقائي حسب الوقت" active={s.themeMode === 'auto'} onPress={() => s.set({ themeMode: 'auto' })} />
              {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                <Pill key={id} label={THEMES[id].label} active={s.themeMode === id} onPress={() => s.set({ themeMode: id })} />
              ))}
            </Row>
            <T muted>جودة المؤثرات</T>
            <Row style={{ flexWrap: 'wrap' }}>
              {([['auto', 'تلقائي'], ['full', 'كاملة'], ['lite', 'خفيفة']] as const).map(([q, label]) => (
                <Pill key={q} label={label} active={s.quality === q} onPress={() => s.set({ quality: q })} />
              ))}
            </Row>
            <T variant="caption" muted>{`المستخدم الآن: ${tierName}. «خفيفة» توقف الحركة المستمرة في السماء لتوفير البطارية على الأجهزة الأبطأ.`}</T>
            <T muted>خط الأذكار</T>
            <Row style={{ flexWrap: 'wrap' }}>
              {(Object.keys(ATHKAR_FONTS) as AthkarFont[]).map((f) => (
                <Pill key={f} label={ATHKAR_FONTS[f].label} active={s.athkarFont === f} onPress={() => s.set({ athkarFont: f })} />
              ))}
            </Row>
            <T center style={{ fontFamily: ATHKAR_FONTS[s.athkarFont].family, fontSize: s.fontSize, lineHeight: s.fontSize * 1.9 }}>
              سُبْحَانَ اللَّهِ وَبِحَمْدِهِ
            </T>
            <Row style={{ flexWrap: 'wrap' }}>
              {FONT_SIZES.map((f) => <Pill key={f} label={toArabicDigits(f)} active={s.fontSize === f} onPress={() => s.set({ fontSize: f })} />)}
            </Row>
          </Group>

          <Group icon="musical-note-outline" title="الأصوات والاهتزاز">
            {toggle('الاهتزاز', s.haptics, 'haptics')}
            {toggle('صوت حبات المسبحة', s.tasbihSound, 'tasbihSound')}
            {toggle('صوت خفيف مع كل عدّة في الأذكار', s.countSound, 'countSound')}
            <T muted>الأصوات المحيطة (في القراءة والمسبحة)</T>
            {hasAmbient() ? (
              <Row style={{ flexWrap: 'wrap' }}>
                {([['off', 'بلا'], ['auto', 'حسب الوقت'], ['rain', 'مطر']] as const).map(([a, label]) => (
                  <Pill key={a} label={label} active={s.ambient === a} onPress={() => s.set({ ambient: a })} />
                ))}
              </Row>
            ) : (
              <T variant="caption" muted>قريبًا: أصوات طبيعية هادئة — طيور الفجر، نسيم، مطر، ليل.</T>
            )}
            <T muted>مستوى الصوت</T>
            <Row style={{ flexWrap: 'wrap' }}>
              {([['low', 'منخفض'], ['mid', 'متوسط'], ['high', 'مرتفع']] as const).map(([v, label]) => (
                <Pill key={v} label={label} active={s.soundVolume === v} onPress={() => s.set({ soundVolume: v })} />
              ))}
            </Row>
          </Group>

          <Group icon="headset-outline" title="تلاوة الأذكار">
            {toggle('تكرار الأذكار المكررة صوتيًا', s.audioRepeat, 'audioRepeat')}
            {toggle('تشغيل جميع الأذكار تباعًا', s.playAll, 'playAll')}
            <T muted>سرعة التشغيل</T>
            <Row style={{ flexWrap: 'wrap' }}>
              {RATES.map((r) => <Pill key={r} label={`${toArabicDigits(r)}×`} active={s.playbackRate === r} onPress={() => s.set({ playbackRate: r })} />)}
            </Row>
          </Group>

          <Group icon="ellipse-outline" title="المسبحة">
            <T muted>حبات المسبحة</T>
            <Row style={{ flexWrap: 'wrap' }}>
              {(Object.keys(BEAD_MATERIALS) as BeadMaterial[]).map((m) => (
                <Pill key={m} label={BEAD_MATERIALS[m]} active={s.beadMaterial === m} onPress={() => s.set({ beadMaterial: m })} />
              ))}
            </Row>
          </Group>

          <Group icon="calendar-outline" title="التقويم">
            <T>{formatDateLine(now, s.hijriOffset)}</T>
            <T variant="caption" muted>تقويم أم القرى. إن كان بلدك يعتمد رؤية الهلال فعدّل التاريخ بالأيام.</T>
            <Row>
              <IconButton name="remove" label="يوم قبل" onPress={() => s.set({ hijriOffset: Math.max(-2, s.hijriOffset - 1) })} />
              <T variant="heading" center style={{ flex: 1 }}>
                {s.hijriOffset === 0 ? 'بلا تعديل' : `${s.hijriOffset > 0 ? '+' : '−'}${toArabicDigits(Math.abs(s.hijriOffset))}`}
              </T>
              <IconButton name="add" label="يوم بعد" onPress={() => s.set({ hijriOffset: Math.min(2, s.hijriOffset + 1) })} />
            </Row>
          </Group>

          <Card onPress={confirmReset}>
            <T variant="heading" color="#d0473b">مسح كل التقدم</T>
          </Card>

          {__DEV__ ? (
            <Card onPress={() => router.push('/lab')}>
              <T variant="caption" muted>شاشة الاختبار (للمطور)</T>
            </Card>
          ) : null}
        </Animated.View>
      </ScrollView>
    </SkyScreen>
  );
}

function Heading({ icon, title, caption }: { icon: ComponentProps<typeof Ionicons>['name']; title: string; caption?: string }) {
  const theme = useTheme();
  return (
    <Row gap={space.md} style={{ flex: 1 }}>
      <Ionicons name={icon} size={20} color={theme.accent} />
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="heading">{title}</T>
        {caption ? <T variant="caption" muted>{caption}</T> : null}
      </View>
    </Row>
  );
}

function Group({ icon, title, children }: { icon: ComponentProps<typeof Ionicons>['name']; title: string; children: ReactNode }) {
  return (
    <Card style={{ gap: space.md }}>
      <Heading icon={icon} title={title} />
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  topbar: { paddingHorizontal: space.sm, paddingTop: space.xs },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
});
