import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlayerBar, useReaderAudio } from '@/components/reader/AudioPlayer';
import { Sheet } from '@/components/Sheet';
import { Button, Card, IconButton, Pill, Ring, Row, T } from '@/components/ui';
import { booksFor, collections, recitersFor, resolveBookId, type ResolvedEntry } from '@/content';
import { useCollection, useNow, useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import { useProgress } from '@/store/progress';
import { FONT_SIZES, useSettings } from '@/store/settings';
import { radius, space } from '@/theme';

type Tab = 'translation' | 'thiker' | 'fadl';

export default function Reader() {
  useKeepAwake();
  const { collection: collectionId, play } = useLocalSearchParams<{ collection: string; play?: string }>();
  const theme = useTheme();
  const now = useNow(30_000);
  const { entries, key, progress, state } = useCollection(collectionId, now);
  const { increment, setIndex, setCount, resetList } = useProgress();
  const fontSize = useSettings((s) => s.fontSize);

  const [tab, setTab] = useState<Tab>('thiker');
  const [menuOpen, setMenuOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const index = Math.min(progress.index, entries.length - 1);
  const entry = entries[index];
  const countAt = (i: number) => progress.counts[i] ?? 0;
  const goTo = (i: number) => {
    setIndex(key, i);
    setTab('thiker');
  };

  const audio = useReaderAudio({ entries, index, counts: progress.counts, count: (i) => increment(key, i, entries[i].num), goTo });

  useEffect(() => {
    if (play === '1' && state !== 'done') audio.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstIncomplete = (from: number) => {
    for (let k = 0; k < entries.length; k++) {
      const i = (from + k) % entries.length;
      if (countAt(i) < entries[i].num) return i;
    }
    return -1;
  };

  const onTap = () => {
    if (tab !== 'thiker' || !entry || countAt(index) >= entry.num) return;
    const n = increment(key, index, entry.num);
    if (n < entry.num) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const next = index + 1 < entries.length && countAt(index + 1) < entries[index + 1].num ? index + 1 : firstIncomplete(index + 1);
    if (next !== -1 && next !== index) setTimeout(() => goTo(next), 350);
  };

  if (!entries.length) return null;

  if (state === 'done') {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
        <TopBar title={collections[collectionId].title} onMenu={() => setMenuOpen(true)} />
        <View style={styles.complete}>
          <Ionicons name="checkmark-circle" size={72} color={theme.success} />
          <T variant="title" center>تقبّل الله منك</T>
          <T muted center>أتممت {collections[collectionId].title}</T>
          <View style={{ alignSelf: 'stretch', gap: space.md, marginTop: space.xl }}>
            <Button label="العودة للرئيسية" onPress={() => router.back()} />
            <Button label="ابدأ من جديد" kind="secondary" onPress={() => resetList(key)} />
          </View>
        </View>
        <ReaderMenu visible={menuOpen} onClose={() => setMenuOpen(false)} collectionId={collectionId} entries={entries} />
      </SafeAreaView>
    );
  }

  const count = countAt(index);
  const remaining = entry.num - count;
  const hasTranslation = !!entry.thiker.translations && Object.keys(entry.thiker.translations).length > 0;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <TopBar title={collections[collectionId].title} onMenu={() => setMenuOpen(true)} />
      <Tabs tab={tab} setTab={setTab} hasTranslation={hasTranslation} />

      <SwipeCard
        onSwipe={(dir) => {
          const order: Tab[] = hasTranslation ? ['translation', 'thiker', 'fadl'] : ['thiker', 'fadl'];
          if (dir === 'left' || dir === 'right') {
            const i = order.indexOf(tab) + (dir === 'right' ? 1 : -1);
            if (order[i]) setTab(order[i]);
          } else if (dir === 'up' && index + 1 < entries.length) goTo(index + 1);
          else if (dir === 'down' && index > 0) goTo(index - 1);
        }}
      >
        {(guardTap) => (<>
        <View style={styles.position}>
          <Pill label={`${toArabicDigits(index + 1)} / ${toArabicDigits(entries.length)}`} onPress={() => setListOpen(true)} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.textWrap}>
          <Pressable onPress={guardTap(onTap)} style={{ flexGrow: 1, justifyContent: 'center' }} accessibilityHint="اضغط للعد">
            {tab === 'thiker' ? (
              <T
                style={{ fontFamily: 'NotoNaskhArabic_400Regular', fontSize, lineHeight: fontSize * 2 }}
                color={entry.thiker.quran ? theme.quran : theme.text}
                center
              >
                {entry.thiker.text}
              </T>
            ) : tab === 'fadl' ? (
              <FadlView entry={entry} />
            ) : (
              <T center muted>الترجمة قريبًا</T>
            )}
          </Pressable>
        </ScrollView>

        <Row style={styles.controls}>
          <View style={styles.side}>
            {!audio.open && audio.hasAudio ? (
              <IconButton name="volume-high-outline" label="تشغيل الصوت" onPress={audio.start} color={theme.accent} />
            ) : null}
          </View>
          <Pressable onPress={guardTap(onTap)} accessibilityRole="button" accessibilityLabel={`المتبقي ${remaining}`}>
            <Ring size={96} stroke={7} progress={count / entry.num} color={theme.accent} track={theme.surfaceAlt}>
              <T variant="title" center style={{ fontSize: 30 }}>{toArabicDigits(remaining)}</T>
            </Ring>
          </Pressable>
          <View style={styles.side}>
            {count > 0 ? (
              <IconButton name="refresh" label="إعادة عدّ هذا الذكر" color={theme.muted} onPress={() => setCount(key, index, 0)} />
            ) : null}
          </View>
        </Row>
        </>)}
      </SwipeCard>

      {audio.open ? (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          <PlayerBar audio={audio} index={index} total={entries.length} goTo={goTo} />
        </View>
      ) : null}

      <ReaderMenu visible={menuOpen} onClose={() => setMenuOpen(false)} collectionId={collectionId} entries={entries} />
      <Sheet visible={listOpen} onClose={() => setListOpen(false)} title={collections[collectionId].title}>
        {entries.map((e, i) => {
          const c = countAt(i);
          const icon = c >= e.num ? 'checkmark-circle' : c > 0 ? 'ellipse-outline' : 'ellipse-outline';
          const color = c >= e.num ? theme.success : c > 0 ? theme.accent : theme.border;
          return (
            <Pressable key={`${e.id}-${i}`} onPress={() => { goTo(i); setListOpen(false); }}>
              <Row gap={space.md} style={[styles.listRow, i === index && { backgroundColor: theme.surfaceAlt }]}>
                <T muted style={{ width: 28 }}>{toArabicDigits(i + 1)}</T>
                <Ionicons name={icon} size={22} color={color} />
                <T style={{ flex: 1 }}>{e.thiker.title}</T>
                <T variant="caption" muted>×{toArabicDigits(e.num)}</T>
              </Row>
            </Pressable>
          );
        })}
      </Sheet>
    </SafeAreaView>
  );
}

function TopBar({ title, onMenu }: { title: string; onMenu: () => void }) {
  return (
    <Row style={styles.topbar}>
      <IconButton name="chevron-forward" label="رجوع" onPress={() => router.back()} />
      <T variant="heading" center style={{ flex: 1 }}>{title}</T>
      <IconButton name="menu" label="الخيارات" onPress={onMenu} />
    </Row>
  );
}

function Tabs({ tab, setTab, hasTranslation }: { tab: Tab; setTab: (t: Tab) => void; hasTranslation: boolean }) {
  const theme = useTheme();
  // Right to left: فضل الذكر · الذكر · ترجمة الذكر
  const items: { id: Tab; label: string }[] = [
    { id: 'fadl', label: 'فضل الذكر ودليله' },
    { id: 'thiker', label: 'الذكر' },
    ...(hasTranslation ? [{ id: 'translation' as Tab, label: 'ترجمة الذكر' }] : []),
  ];
  return (
    <Row style={{ justifyContent: 'center', paddingVertical: space.sm }} gap={space.lg}>
      {items.map((it) => {
        const active = it.id === tab;
        return (
          <Pressable key={it.id} onPress={() => setTab(it.id)} hitSlop={8} accessibilityRole="tab" accessibilityState={{ selected: active }}>
            <T
              variant={active ? 'heading' : 'caption'}
              color={active ? theme.text : theme.muted}
              style={!active && { opacity: 0.7 }}
            >
              {it.label}
            </T>
          </Pressable>
        );
      })}
    </Row>
  );
}

type Dir = 'left' | 'right' | 'up' | 'down';

/**
 * Swipe shortcuts on the card: horizontal switches tabs, a quick vertical flick moves between
 * athkar. `guardTap` wraps the tap-to-count handler so the tap that ends a swipe is ignored.
 */
function SwipeCard({ children, onSwipe }: {
  children: (guardTap: (fn: () => void) => () => void) => React.ReactNode; onSwipe: (dir: Dir) => void;
}) {
  const theme = useTheme();
  const start = useRef({ x: 0, y: 0, t: 0 });
  const moved = useRef(false);
  const guardTap = (fn: () => void) => () => {
    if (!moved.current) fn();
  };
  return (
    <View
      style={{ flex: 1, paddingHorizontal: space.lg, paddingBottom: space.md }}
      onTouchStart={(e) => {
        start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, t: Date.now() };
        moved.current = false;
      }}
      onTouchMove={(e) => {
        const dx = e.nativeEvent.pageX - start.current.x;
        const dy = e.nativeEvent.pageY - start.current.y;
        if (Math.abs(dx) > 12 || Math.abs(dy) > 12) moved.current = true;
      }}
      onTouchEnd={(e) => {
        const dx = e.nativeEvent.pageX - start.current.x;
        const dy = e.nativeEvent.pageY - start.current.y;
        const dt = Date.now() - start.current.t;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 700) onSwipe(dx > 0 ? 'right' : 'left');
        else if (Math.abs(dy) > 90 && Math.abs(dy) > Math.abs(dx) * 2 && dt < 300) onSwipe(dy < 0 ? 'up' : 'down');
      }}
    >
      <View style={[styles.card, { backgroundColor: theme.surface }]}>{children(guardTap)}</View>
    </View>
  );
}

function FadlView({ entry }: { entry: ResolvedEntry }) {
  const theme = useTheme();
  const ev = entry.evidence;
  if (!entry.fadl && !ev) return <T center muted>لم يُضف فضل هذا الذكر بعد.</T>;
  return (
    <View style={{ gap: space.lg }}>
      {entry.fadl ? (
        <View style={{ gap: space.xs }}>
          <T variant="caption" muted>الفضل</T>
          <T style={{ fontSize: 19, lineHeight: 34 }}>{entry.fadl}</T>
        </View>
      ) : null}
      {ev?.text ? (
        <View style={{ gap: space.xs }}>
          <T variant="caption" muted>الدليل</T>
          <T style={{ fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 19, lineHeight: 36 }}>{ev.text}</T>
        </View>
      ) : null}
      {ev?.source || ev?.grade ? (
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {ev.source ? <T muted style={{ flexShrink: 1 }}>{ev.source}</T> : null}
          {ev.grade ? (
            <View style={[styles.grade, { backgroundColor: theme.surfaceAlt }]}>
              <T variant="caption" style={{ fontWeight: '600' }}>{ev.grade}{ev.gradeNote ? ` — ${ev.gradeNote}` : ''}</T>
            </View>
          ) : null}
        </Row>
      ) : null}
    </View>
  );
}

function ReaderMenu({ visible, onClose, collectionId, entries }: {
  visible: boolean; onClose: () => void; collectionId: string; entries: ResolvedEntry[];
}) {
  const settings = useSettings();
  const books = booksFor(collectionId);
  const activeBook = resolveBookId(collectionId, settings.bookByCollection[collectionId]);
  const reciterList = recitersFor(entries);
  const sizeIndex = FONT_SIZES.indexOf(settings.fontSize);

  return (
    <Sheet visible={visible} onClose={onClose} title="الخيارات">
      {books.length > 1 ? (
        <Card alt style={{ gap: space.sm }}>
          <T variant="heading">الكتاب</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {books.map((b) => (
              <Pill
                key={b.id}
                label={b.name}
                active={activeBook === b.id}
                onPress={() => settings.setBook(collectionId, b.id)}
              />
            ))}
          </Row>
        </Card>
      ) : null}
      <Card alt style={{ gap: space.sm }}>
        <T variant="heading">حجم الخط</T>
        <Row>
          <IconButton name="remove" label="تصغير الخط" onPress={() => sizeIndex > 0 && settings.set({ fontSize: FONT_SIZES[sizeIndex - 1] })} />
          <T variant="heading" center style={{ flex: 1 }}>{toArabicDigits(settings.fontSize)}</T>
          <IconButton name="add" label="تكبير الخط" onPress={() => sizeIndex < FONT_SIZES.length - 1 && settings.set({ fontSize: FONT_SIZES[sizeIndex + 1] })} />
        </Row>
      </Card>
      {reciterList.length ? (
        <Card alt style={{ gap: space.sm }}>
          <T variant="heading">القارئ</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {reciterList.map((r) => (
              <Pill
                key={r.id}
                label={r.covered < r.total ? `${r.name} (جزئي ${toArabicDigits(r.covered)}/${toArabicDigits(r.total)})` : r.name}
                active={settings.reciter === r.id}
                onPress={() => settings.set({ reciter: r.id })}
              />
            ))}
          </Row>
        </Card>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topbar: { paddingHorizontal: space.sm, paddingTop: space.xs, justifyContent: 'space-between' },
  card: { flex: 1, borderRadius: radius.lg, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.lg },
  position: { alignSelf: 'center' },
  textWrap: { flexGrow: 1, paddingVertical: space.lg },
  controls: { justifyContent: 'space-between', paddingTop: space.sm },
  side: { width: 48, alignItems: 'center' },
  complete: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  listRow: { paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.sm },
  grade: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill },
});
