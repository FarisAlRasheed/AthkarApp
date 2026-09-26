import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Countdown } from '@/components/Countdown';
import { DayArc } from '@/components/home/DayArc';
import { Khatam } from '@/components/Khatam';
import { SkyScreen } from '@/components/Sky';
import { Button, Card, IconButton, Pill, Press, Row, T } from '@/components/ui';
import { booksFor, calendar, collectionIds, collections, tasbih as tasbihContent } from '@/content';
import { collectionState, useCollection, useMinute, usePrayerTimes, useTheme } from '@/hooks';
import { formatIn, formatTime, toArabicDigits } from '@/lib/arabic';
import { specialDay } from '@/lib/calendar';
import { formatDateLine, toHijri } from '@/lib/hijri';
import { nextTime, PRAYER_LABELS, TIME_NAMES } from '@/lib/prayer';
import { useTier } from '@/lib/quality';
import { suggest } from '@/lib/schedule';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useSkyScene } from '@/store/sky';
import { useTasbih } from '@/store/tasbih';
import { fonts, motion, radius, space } from '@/theme';

// Sections ease in one after another on a cold start only — daily returns to home don't wait.
const session = { entered: false };

const ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  morning: 'sunny-outline',
  evening: 'partly-sunny-outline',
  'post-prayer': 'hand-left-outline',
  sleep: 'moon-outline',
};

/** «ابن باز» from «الشيخ ابن باز», shown only where there is more than one book to choose from. */
function bookCaption(collectionId: string, bookId: string): string | null {
  const books = booksFor(collectionId);
  if (books.length < 2) return null;
  return books.find((b) => b.id === bookId)?.name.replace(/^الشيخ\s+/, '') ?? null;
}

export default function Home() {
  // The day arc shows the sun and moon here, so the sky doesn't draw them twice.
  useSkyScene({ kind: 'clock', shooting: true, celestial: false });
  const onboarded = useSettings((s) => s.onboarded || !!s.place);
  const tier = useTier();
  const [animate] = useState(() => !session.entered && tier !== 'still');
  useEffect(() => {
    session.entered = true;
  }, []);
  const enter = (i: number) =>
    animate ? FadeInDown.delay(80 + i * 70).duration(motion.duration.calm).easing(motion.easing.enter) : undefined;

  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <SkyScreen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter(0)}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <T variant="title" style={{ fontSize: 28 }}>أذكارنا</T>
              <DateLine />
            </View>
            <IconButton name="settings-outline" label="الإعدادات" onPress={() => router.push('/settings')} />
          </Row>
        </Animated.View>
        <Animated.View entering={enter(1)}><PrayerSection /></Animated.View>
        <SpecialDayCard />
        <Animated.View entering={enter(2)}><SuggestionCard /></Animated.View>
        <Animated.View entering={enter(3)}>
          <T variant="heading" style={{ marginTop: space.md }}>جميع الأذكار</T>
        </Animated.View>
        {collectionIds.map((id, i) => (
          <Animated.View key={id} entering={enter(4 + i)}>
            <CollectionRow collectionId={id} />
          </Animated.View>
        ))}
        <Animated.View entering={enter(4 + collectionIds.length)}><TasbihRow /></Animated.View>
      </ScrollView>
    </SkyScreen>
  );
}

function PrayerSection() {
  const theme = useTheme();
  const tier = useTier();
  const { now, today, tomorrow, hasPlace } = usePrayerTimes();
  const place = useSettings((s) => s.place);
  const hijriOffset = useSettings((s) => s.hijriOffset);

  if (!hasPlace) {
    return (
      <Card style={{ gap: space.md }}>
        <T variant="heading">مواقيت الصلاة</T>
        <T muted>حدّد موقعك لعرض مواقيت الصلاة واقتراح الأذكار المناسبة لوقتك.</T>
        <Button label="تحديد الموقع" icon="location-outline" onPress={() => router.push('/prayer')} />
      </Card>
    );
  }

  const next = nextTime(now, today, tomorrow);
  // In Ramadan the countdown speaks of the fast: الإفطار at Maghrib, الإمساك at Fajr.
  const ramadan = toHijri(now, hijriOffset)?.month === 9 || toHijri(tomorrow.fajr, hijriOffset)?.month === 9;
  const label = ramadan && next.name === 'maghrib' ? 'الإفطار' : ramadan && next.name === 'fajr' ? 'الإمساك' : PRAYER_LABELS[next.name];
  return (
    <Press onPress={() => router.push('/prayer')} depth={motion.press.card} style={{ gap: space.md, paddingVertical: space.sm }}>
      <View style={{ alignItems: 'center' }}>
        <T muted center>بقي على {label}</T>
        <Countdown target={next.at} style={{ fontSize: 52, lineHeight: 70 }} />
        <Row gap={4}>
          <Ionicons name="location-outline" size={13} color={theme.muted} />
          <T variant="caption" muted>{place?.name}</T>
        </Row>
      </View>
      <DayArc tier={tier} nextAt={next.at} />
      <Row gap={space.xs} style={[styles.times, { backgroundColor: theme.glass, borderColor: theme.border }]}>
        {TIME_NAMES.map((name) => {
          const active = name === next.name;
          return (
            <View key={name} style={[styles.cell, active && { backgroundColor: theme.accent }]}>
              <T variant="caption" center color={active ? theme.onAccent : theme.muted} style={{ fontSize: 12 }}>{PRAYER_LABELS[name]}</T>
              <T variant="caption" bold center color={active ? theme.onAccent : theme.text}>
                {formatTime(today[name]).replace(/ [صم]$/, '')}
              </T>
            </View>
          );
        })}
      </Row>
    </Press>
  );
}

function DateLine() {
  const now = useMinute();
  const offset = useSettings((s) => s.hijriOffset);
  return <T variant="caption" muted>{formatDateLine(now, offset)}</T>;
}

/** Friday, the white days, Ramadan… (DESIGN_PLAN §8). One line, and a way to act on it. */
function SpecialDayCard() {
  const theme = useTheme();
  const { now, today } = usePrayerTimes();
  const offset = useSettings((s) => s.hijriOffset);
  const id = specialDay(now, today.maghrib, offset);
  const day = id ? calendar.days[id] : null;
  if (!day) return null;
  const inner = (
    <Row gap={space.md}>
      <Khatam size={28} color={theme.accent} strokeWidth={1.3} />
      <View style={{ flex: 1 }}>
        <T variant="heading" style={{ fontFamily: fonts.title, fontSize: 18 }}>{day.title}</T>
        <T variant="caption" muted>{day.text}</T>
      </View>
      {day.tasbih ? <Ionicons name="chevron-back" size={18} color={theme.muted} /> : null}
    </Row>
  );
  const look = [styles.special, { backgroundColor: theme.glass, borderColor: theme.border }];
  return (
    <Animated.View entering={FadeIn.duration(motion.duration.calm)}>
      {day.tasbih ? (
        <Press onPress={() => router.push(`/tasbih?phrase=${day.tasbih}`)} depth={motion.press.card} style={look} accessibilityHint="يفتح المسبحة">
          {inner}
        </Press>
      ) : (
        <View style={look}>{inner}</View>
      )}
    </Animated.View>
  );
}

function SuggestionCard() {
  const theme = useTheme();
  const lists = useProgress((s) => s.lists);
  const books = useSettings((s) => s.bookByCollection);
  const { now, timesFor } = usePrayerTimes();
  const { suggestion, next } = suggest(now, timesFor, (c) => collectionState(lists, c, books[c], now, timesFor) === 'done');

  const isTasbih = suggestion.kind === 'tasbih';
  const collectionId = isTasbih ? 'morning' : suggestion.collectionId;
  const { entries, done, state } = useCollection(collectionId);
  const started = !isTasbih && state === 'partial';

  const title = isTasbih ? 'المسبحة' : collections[suggestion.collectionId].title;
  const subtitle = isTasbih && next
    ? `أتممت أذكار الوقت — ${collections[next.collectionId].title} بعد ${formatIn(next.at.getTime() - now.getTime())}`
    : started ? `${toArabicDigits(done)} من ${toArabicDigits(entries.length)}` : `${toArabicDigits(entries.length)} ذكرًا`;
  const open = () => (isTasbih ? router.push('/tasbih') : router.push(`/read/${suggestion.collectionId}`));

  // The listen button sits beside the card's button, not inside it (nested buttons are invalid on web).
  return (
    <View>
      <Press onPress={open} depth={motion.press.card} style={[styles.suggestion, { backgroundColor: theme.glass, borderColor: theme.border }]}>
        <T variant="caption" muted>المقترح الآن</T>
        <T variant="title" style={{ fontSize: 30, lineHeight: 48 }}>{title}</T>
        <T variant="caption" muted>{subtitle}</T>
        {!isTasbih ? (
          <View style={[styles.bar, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.barFill, { backgroundColor: theme.accent, width: `${(done / Math.max(1, entries.length)) * 100}%` }]} />
          </View>
        ) : null}
        <Row style={{ marginTop: space.sm }}>
          <View style={[styles.cta, { backgroundColor: theme.accent }]}>
            <T variant="heading" color={theme.onAccent}>
              {isTasbih ? 'المسبحة' : started ? `أكمل · ${toArabicDigits(done)} من ${toArabicDigits(entries.length)}` : 'ابدأ'}
            </T>
            <Ionicons name="chevron-back" size={18} color={theme.onAccent} />
          </View>
        </Row>
      </Press>
      {!isTasbih ? (
        <View style={styles.listen}>
          <IconButton name="headset-outline" label={`استمع إلى ${title}`} onPress={() => router.push(`/read/${suggestion.collectionId}?play=1`)} />
        </View>
      ) : null}
    </View>
  );
}

function CollectionRow({ collectionId }: { collectionId: string }) {
  const theme = useTheme();
  const { entries, state, done, bookId } = useCollection(collectionId);
  const book = bookCaption(collectionId, bookId);
  const count = state === 'done' ? 'تمّت لهذا الوقت' : state === 'partial'
    ? `${toArabicDigits(done)} من ${toArabicDigits(entries.length)}`
    : `${toArabicDigits(entries.length)} ذكرًا`;

  // The row and its audio button are siblings: nested buttons are invalid on web.
  return (
    <Row style={[styles.row, { backgroundColor: theme.glass, borderColor: state === 'done' ? theme.glow : theme.border }]}>
      <Press onPress={() => router.push(`/read/${collectionId}`)} depth={motion.press.card} containerStyle={{ flex: 1 }}>
        <Row gap={space.md}>
          <View style={[styles.icon, { backgroundColor: state === 'done' ? theme.success : theme.surfaceAlt }]}>
            <Ionicons name={state === 'done' ? 'checkmark' : ICONS[collectionId]} size={20} color={state === 'done' ? '#ffffff' : theme.text} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="heading" style={{ fontFamily: fonts.title, fontSize: 19 }}>{collections[collectionId].title}</T>
            <T variant="caption" muted>{book ? `${book} · ${count}` : count}</T>
          </View>
          {state === 'partial' ? <Pill label="إكمال" active /> : null}
        </Row>
      </Press>
      <IconButton name="headset-outline" label={`استمع إلى ${collections[collectionId].title}`} size={20} onPress={() => router.push(`/read/${collectionId}?play=1`)} />
    </Row>
  );
}

function TasbihRow() {
  const theme = useTheme();
  const phraseId = useTasbih((s) => s.phraseId);
  const customText = useTasbih((s) => s.customText);
  const count = useTasbih((s) => s.count);
  const phrase = phraseId === 'custom' ? customText : tasbihContent.phrases.find((p) => p.id === phraseId)?.text;
  return (
    <Press onPress={() => router.push('/tasbih')} depth={motion.press.card} style={[styles.row, { backgroundColor: theme.glass, borderColor: theme.border }]}>
      <Row gap={space.md}>
        <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={20} color={theme.text} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="heading" style={{ fontFamily: fonts.title, fontSize: 19 }}>المسبحة</T>
          <T variant="caption" muted numberOfLines={1}>
            {count && phrase ? `${phrase} · ${toArabicDigits(count)}` : 'تسبيح وتحميد وتكبير واستغفار'}
          </T>
        </View>
      </Row>
    </Press>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },
  times: { borderRadius: radius.md, padding: space.xs, borderWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, borderRadius: radius.sm, paddingVertical: space.sm },
  suggestion: { borderRadius: radius.lg, padding: space.xl, gap: space.xs, borderWidth: StyleSheet.hairlineWidth },
  listen: { position: 'absolute', left: space.xl, bottom: space.xl },
  special: { borderRadius: radius.lg, paddingVertical: space.md, paddingHorizontal: space.lg, borderWidth: StyleSheet.hairlineWidth },
  cta: { flexDirection: 'row-reverse', alignItems: 'center', gap: space.xs, paddingHorizontal: space.lg, minHeight: 44, borderRadius: radius.pill },
  bar: { height: 5, borderRadius: 3, marginTop: space.sm, overflow: 'hidden', flexDirection: 'row-reverse' },
  barFill: { height: 5, borderRadius: 3 },
  row: { borderRadius: radius.lg, paddingVertical: space.md, paddingHorizontal: space.md, borderWidth: StyleSheet.hairlineWidth },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
