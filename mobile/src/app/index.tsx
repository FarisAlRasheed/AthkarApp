import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, IconButton, Pill, Row, T } from '@/components/ui';
import { collectionIds, collections } from '@/content';
import { collectionState, useCollection, useNow, usePrayerTimes, useTheme } from '@/hooks';
import { formatCountdown, formatIn, formatTime, toArabicDigits } from '@/lib/arabic';
import { nextTime, PRAYER_LABELS, TIME_NAMES } from '@/lib/prayer';
import { suggest } from '@/lib/schedule';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { radius, space } from '@/theme';

export default function Home() {
  const theme = useTheme();
  const now = useNow(1000);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={space.sm}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} contentFit="contain" />
            <T variant="title">أذكارنا</T>
          </Row>
          <IconButton name="settings-outline" label="الإعدادات" onPress={() => router.push('/settings')} />
        </Row>
        <PrayerSection now={now} />
        <SuggestionCard now={now} />
        <T variant="heading" style={{ marginTop: space.sm }}>جميع الأذكار</T>
        {collectionIds.map((id) => <CollectionRow key={id} collectionId={id} now={now} />)}
        <TasbihRow />
      </ScrollView>
    </SafeAreaView>
  );
}

function PrayerSection({ now }: { now: Date }) {
  const theme = useTheme();
  const { today, tomorrow, hasPlace } = usePrayerTimes(now);
  const place = useSettings((s) => s.place);

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
  return (
    <Card onPress={() => router.push('/prayer')} style={{ gap: space.lg }}>
      <View style={{ alignItems: 'center', gap: space.xs }}>
        <T muted center>بقي على {PRAYER_LABELS[next.name]}</T>
        <T variant="display" center>{formatCountdown(next.at.getTime() - now.getTime())}</T>
        <T variant="caption" muted center>{place?.name}</T>
      </View>
      <Row gap={space.xs} style={{ justifyContent: 'space-between' }}>
        {TIME_NAMES.map((name) => {
          const active = name === next.name;
          return (
            <View key={name} style={[styles.cell, active && { backgroundColor: theme.accent }]}>
              <T variant="caption" center color={active ? theme.onAccent : theme.muted}>{PRAYER_LABELS[name]}</T>
              <T variant="caption" center color={active ? theme.onAccent : theme.text} style={{ fontWeight: '600' }}>
                {formatTime(today[name]).replace(/ [صم]$/, '')}
              </T>
            </View>
          );
        })}
      </Row>
    </Card>
  );
}

function SuggestionCard({ now }: { now: Date }) {
  const theme = useTheme();
  const lists = useProgress((s) => s.lists);
  const books = useSettings((s) => s.bookByCollection);
  const { timesFor } = usePrayerTimes(now);
  const { suggestion, next } = suggest(now, timesFor, (c) => collectionState(lists, c, books[c], now, timesFor) === 'done');

  const isTasbih = suggestion.kind === 'tasbih';
  const title = isTasbih ? 'المسبحة' : collections[suggestion.collectionId].title;
  const subtitle = isTasbih && next
    ? `أتممت أذكار الوقت — ${collections[next.collectionId].title} بعد ${formatIn(next.at.getTime() - now.getTime())}`
    : 'اضغط للبدء';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => (isTasbih ? router.push('/tasbih') : router.push(`/read/${suggestion.collectionId}`))}
      style={({ pressed }) => [styles.suggestion, { backgroundColor: theme.accent }, pressed && { opacity: 0.9 }]}
    >
      <T variant="caption" color={theme.onAccent} style={{ opacity: 0.85 }}>المقترح الآن</T>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="title" color={theme.onAccent} style={{ fontSize: 28 }}>{title}</T>
        <Ionicons name={isTasbih ? 'ellipse-outline' : 'book-outline'} size={32} color={theme.onAccent} />
      </Row>
      <T variant="caption" color={theme.onAccent} style={{ opacity: 0.9 }}>{subtitle}</T>
    </Pressable>
  );
}

function CollectionRow({ collectionId, now }: { collectionId: string; now: Date }) {
  const theme = useTheme();
  const { entries, progress, state } = useCollection(collectionId, now);
  const doneCount = entries.filter((e, i) => (progress.counts[i] ?? 0) >= e.num).length;

  // The row and its play button are siblings: nested buttons are invalid on web.
  return (
    <Card style={styles.row}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable
          onPress={() => router.push(`/read/${collectionId}`)}
          accessibilityRole="button"
          style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.7 }]}
        >
          <Row gap={space.md}>
            <StateMark state={state} />
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="heading">{collections[collectionId].title}</T>
              <T variant="caption" muted>
                {state === 'done' ? 'تمت لهذا الوقت' : state === 'partial'
                  ? `${toArabicDigits(doneCount)} من ${toArabicDigits(entries.length)}`
                  : `${toArabicDigits(entries.length)} ذكرًا`}
              </T>
            </View>
            {state === 'partial' ? <Pill label="إكمال" active /> : null}
          </Row>
        </Pressable>
        <IconButton
          name="play" label={`تشغيل ${collections[collectionId].title}`} size={18}
          color={theme.accent} onPress={() => router.push(`/read/${collectionId}?play=1`)}
        />
      </Row>
    </Card>
  );
}

function StateMark({ state }: { state: 'untouched' | 'partial' | 'done' }) {
  const theme = useTheme();
  if (state === 'done') return <Ionicons name="checkmark-circle" size={28} color={theme.success} />;
  if (state === 'partial') return <Ionicons name="ellipse-outline" size={28} color={theme.accent} style={{ opacity: 0.9 }} />;
  return <Ionicons name="ellipse-outline" size={28} color={theme.border} />;
}

function TasbihRow() {
  const theme = useTheme();
  return (
    <Card onPress={() => router.push('/tasbih')} style={styles.row}>
      <Row gap={space.md}>
        <Ionicons name="radio-button-on-outline" size={28} color={theme.accent} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="heading">المسبحة</T>
          <T variant="caption" muted>تسبيح وتحميد وتكبير واستغفار</T>
        </View>
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  logo: { width: 36, height: 36 },
  cell: { flex: 1, borderRadius: radius.sm, paddingVertical: space.sm, gap: 2 },
  suggestion: { borderRadius: radius.lg, padding: space.xl, gap: space.sm },
  row: { paddingVertical: space.md },
});
