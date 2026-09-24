import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SkyScreen } from '@/components/Sky';
import { Button, Card, IconButton, Pill, Press, Row, T } from '@/components/ui';
import { collectionIds, collections } from '@/content';
import { collectionState, useCollection, useNow, usePrayerTimes, useTheme } from '@/hooks';
import { formatCountdown, formatIn, formatTime, toArabicDigits } from '@/lib/arabic';
import { nextTime, PRAYER_LABELS, TIME_NAMES } from '@/lib/prayer';
import { suggest } from '@/lib/schedule';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { fonts, radius, space } from '@/theme';

/** Sections ease in one after another when the screen opens. */
const enter = (i: number) => FadeInDown.delay(80 + i * 70).duration(520).springify().damping(18);

const ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  morning: 'sunny-outline',
  evening: 'partly-sunny-outline',
  'post-prayer': 'hand-left-outline',
  sleep: 'moon-outline',
};

export default function Home() {
  const now = useNow(1000);

  return (
    <SkyScreen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter(0)}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="title" style={{ fontSize: 28 }}>أذكارنا</T>
            <IconButton name="settings-outline" label="الإعدادات" onPress={() => router.push('/settings')} />
          </Row>
        </Animated.View>
        <Animated.View entering={enter(1)}><PrayerSection now={now} /></Animated.View>
        <Animated.View entering={enter(2)}><SuggestionCard now={now} /></Animated.View>
        <Animated.View entering={enter(3)}>
          <T variant="heading" style={{ marginTop: space.md }}>جميع الأذكار</T>
        </Animated.View>
        {collectionIds.map((id, i) => (
          <Animated.View key={id} entering={enter(4 + i)}>
            <CollectionRow collectionId={id} now={now} />
          </Animated.View>
        ))}
        <Animated.View entering={enter(4 + collectionIds.length)}><TasbihRow /></Animated.View>
      </ScrollView>
    </SkyScreen>
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
    <Press onPress={() => router.push('/prayer')} depth={0.98} style={{ gap: space.lg, paddingVertical: space.md }}>
      <View style={{ alignItems: 'center' }}>
        <T muted center>بقي على {PRAYER_LABELS[next.name]}</T>
        <T variant="display" center style={{ fontSize: 52, lineHeight: 66 }}>{formatCountdown(next.at.getTime() - now.getTime())}</T>
        <Row gap={4}>
          <Ionicons name="location-outline" size={13} color={theme.muted} />
          <T variant="caption" muted>{place?.name}</T>
        </Row>
      </View>
      <Row gap={space.xs} style={[styles.times, { backgroundColor: theme.glass, borderColor: theme.border }]}>
        {TIME_NAMES.map((name) => {
          const active = name === next.name;
          return (
            <View key={name} style={[styles.cell, active && { backgroundColor: theme.accent }]}>
              <T variant="caption" center color={active ? theme.onAccent : theme.muted} style={{ fontSize: 11 }}>{PRAYER_LABELS[name]}</T>
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

function SuggestionCard({ now }: { now: Date }) {
  const theme = useTheme();
  const lists = useProgress((s) => s.lists);
  const books = useSettings((s) => s.bookByCollection);
  const { timesFor } = usePrayerTimes(now);
  const { suggestion, next } = suggest(now, timesFor, (c) => collectionState(lists, c, books[c], now, timesFor) === 'done');

  const isTasbih = suggestion.kind === 'tasbih';
  const collectionId = isTasbih ? 'morning' : suggestion.collectionId;
  const { entries, progress } = useCollection(collectionId, now);
  const done = entries.filter((e, i) => (progress.counts[i] ?? 0) >= e.num).length;
  const started = !isTasbih && progress.counts.some((c) => c > 0);

  const title = isTasbih ? 'المسبحة' : collections[suggestion.collectionId].title;
  const subtitle = isTasbih && next
    ? `أتممت أذكار الوقت — ${collections[next.collectionId].title} بعد ${formatIn(next.at.getTime() - now.getTime())}`
    : started ? `${toArabicDigits(done)} من ${toArabicDigits(entries.length)}` : `${toArabicDigits(entries.length)} ذكرًا`;

  return (
    <Press
      onPress={() => (isTasbih ? router.push('/tasbih') : router.push(`/read/${suggestion.collectionId}`))}
      depth={0.97}
      style={[styles.suggestion, { backgroundColor: theme.glass, borderColor: theme.border }]}
    >
      <T variant="caption" muted>المقترح الآن</T>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="title" style={{ fontSize: 30, lineHeight: 48 }}>{title}</T>
        <View style={[styles.go, { backgroundColor: theme.accent }]}>
          <Ionicons name={started ? 'play' : 'chevron-back'} size={20} color={theme.onAccent} />
        </View>
      </Row>
      <T variant="caption" muted>{subtitle}</T>
      {!isTasbih ? (
        <View style={[styles.bar, { backgroundColor: theme.surfaceAlt }]}>
          <View style={[styles.barFill, { backgroundColor: theme.accent, width: `${(done / Math.max(1, entries.length)) * 100}%` }]} />
        </View>
      ) : null}
    </Press>
  );
}

function CollectionRow({ collectionId, now }: { collectionId: string; now: Date }) {
  const theme = useTheme();
  const { entries, progress, state } = useCollection(collectionId, now);
  const doneCount = entries.filter((e, i) => (progress.counts[i] ?? 0) >= e.num).length;

  // The row and its play button are siblings: nested buttons are invalid on web.
  return (
    <Row style={[styles.row, { backgroundColor: theme.glass, borderColor: theme.border }]}>
      <Press onPress={() => router.push(`/read/${collectionId}`)} depth={0.97} style={{ flex: 1 }}>
        <Row gap={space.md}>
          <View style={[styles.icon, { backgroundColor: state === 'done' ? theme.success : theme.surfaceAlt }]}>
            <Ionicons name={state === 'done' ? 'checkmark' : ICONS[collectionId]} size={20} color={state === 'done' ? '#ffffff' : theme.text} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="heading" style={{ fontFamily: fonts.title, fontSize: 19 }}>{collections[collectionId].title}</T>
            <T variant="caption" muted>
              {state === 'done' ? 'تمّت لهذا الوقت' : state === 'partial'
                ? `${toArabicDigits(doneCount)} من ${toArabicDigits(entries.length)}`
                : `${toArabicDigits(entries.length)} ذكرًا`}
            </T>
          </View>
          {state === 'partial' ? <Pill label="إكمال" active /> : null}
        </Row>
      </Press>
      <IconButton name="play" label={`تشغيل ${collections[collectionId].title}`} size={18} onPress={() => router.push(`/read/${collectionId}?play=1`)} />
    </Row>
  );
}

function TasbihRow() {
  const theme = useTheme();
  return (
    <Press onPress={() => router.push('/tasbih')} depth={0.97} style={[styles.row, { backgroundColor: theme.glass, borderColor: theme.border }]}>
      <Row gap={space.md}>
        <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={20} color={theme.text} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="heading" style={{ fontFamily: fonts.title, fontSize: 19 }}>المسبحة</T>
          <T variant="caption" muted>تسبيح وتحميد وتكبير واستغفار</T>
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
  go: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 5, borderRadius: 3, marginTop: space.sm, overflow: 'hidden', flexDirection: 'row-reverse' },
  barFill: { height: 5, borderRadius: 3 },
  row: { borderRadius: radius.lg, paddingVertical: space.md, paddingHorizontal: space.md, borderWidth: StyleSheet.hairlineWidth },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
