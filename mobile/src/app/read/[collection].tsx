import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type LayoutRectangle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Khatam } from '@/components/Khatam';
import { Counter } from '@/components/reader/Counter';
import { Motes, Ripples, type MotesHandle, type RipplesHandle } from '@/components/reader/Effects';
import { Ending, Opening } from '@/components/reader/Moments';
import { ThikerText } from '@/components/reader/ThikerText';
import { Thread } from '@/components/reader/Thread';
import { PlayerBar, useReaderAudio } from '@/components/reader/AudioPlayer';
import { Sheet } from '@/components/Sheet';
import { SkyScreen } from '@/components/Sky';
import { Card, IconButton, Pill, Press, Row, T } from '@/components/ui';
import { booksFor, collections, recitersFor, resolveBookId, type ResolvedEntry } from '@/content';
import { goBack, useCollection, useMinute, useScreenAwake, useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import { feel } from '@/lib/feel';
import { useTier } from '@/lib/quality';
import { dateKey } from '@/lib/schedule';
import { sound, useAmbient } from '@/lib/sound';
import { useProgress } from '@/store/progress';
import { FONT_SIZES, useSettings } from '@/store/settings';
import { useSkyScene } from '@/store/sky';
import { ATHKAR_FONTS, motion, radius, space, type AthkarFont } from '@/theme';

type Tab = 'translation' | 'thiker' | 'fadl';

/** Timings of a thiker's completion (DESIGN_PLAN §7.3), by quality tier. */
const COMPLETE = {
  full: { riseDelay: 180, rise: 650, next: 700, enter: 450 },
  lite: { riseDelay: 0, rise: 280, next: 300, enter: 300 },
  still: { riseDelay: 0, rise: 150, next: 200, enter: 200 },
} as const;
const SETTLE_MS = 450;

export default function Reader() {
  useScreenAwake();
  const { collection: collectionId, play } = useLocalSearchParams<{ collection: string; play?: string }>();
  const theme = useTheme();
  const tier = useTier();
  const now = useMinute();
  const { height } = useWindowDimensions();
  const { entries, key, progress, state, done } = useCollection(collectionId);
  const fontSize = useSettings((s) => s.fontSize);

  const [tab, setTab] = useState<Tab>('thiker');
  const [menuOpen, setMenuOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  // Mid-completion: the words are rising; the ending waits for them.
  const [finishing, setFinishing] = useState(false);
  const [band, setBand] = useState(() => Math.min(150, Math.max(96, height * 0.16)));

  // The opening moment: the first time each day the collection starts fresh.
  const today = dateKey(now);
  const [opening, setOpening] = useState(
    () => state === 'untouched' && play !== '1' && tier !== 'still' && !!collections[collectionId]?.opening
      && useProgress.getState().openedOn[collectionId] !== today,
  );
  useEffect(() => {
    if (opening) useProgress.getState().markOpened(collectionId, today);
    // Only on mount: marking once is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = entries.length;
  const showEnding = state === 'done' && !finishing;
  useSkyScene({
    kind: 'journey', collectionId, progress: total ? done / total : 0, done, total, band: Math.round(band),
    dim: opening ? 0.25 : showEnding && collectionId === 'sleep' ? 0.4 : 0,
  });

  const index = Math.min(progress.index, Math.max(0, total - 1));
  const entry = entries[index];
  const countAt = (i: number) => progress.counts[i] ?? 0;

  // ── the text's motion ──
  const textOpacity = useSharedValue(1);
  const textY = useSharedValue(0);
  const glow = useSharedValue(0);
  const cardIn = useSharedValue(opening ? 0 : 1);
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.get(), transform: [{ translateY: textY.get() }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() * 0.5 }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: cardIn.get(), transform: [{ translateY: (1 - cardIn.get()) * 40 }] }));

  const t = COMPLETE[tier];
  const completing = useRef(false);
  const settleUntil = useRef(0);
  const pendingIndex = useRef<number | null>(null);
  const ripples = useRef<RipplesHandle>(null);
  const motes = useRef<MotesHandle>(null);
  const textBox = useRef<LayoutRectangle | null>(null);
  const cardBox = useRef<LayoutRectangle | null>(null);

  /** The new thiker arrives: from below after a completion, from the side of travel otherwise. */
  const arrive = useCallback((from: number, ms: number) => {
    textY.set(from);
    textOpacity.set(0);
    textY.set(withDelay(40, withTiming(0, { duration: ms, easing: motion.easing.enter })));
    textOpacity.set(withDelay(40, withTiming(1, { duration: ms, easing: motion.easing.enter })));
  }, [textY, textOpacity]);

  /** Manual moves (swipe, list, player) slide; only completion rises. */
  const goTo = useCallback((i: number) => {
    if (completing.current) {
      pendingIndex.current = i;
      return;
    }
    const cur = useProgress.getState();
    const from = i > index ? 24 : -24;
    cur.setIndex(key, i);
    setTab('thiker');
    arrive(tier === 'still' ? 0 : from, tier === 'full' ? 260 : 200);
  }, [index, key, arrive, tier]);

  const nextIncomplete = (from: number) => {
    for (let k = 1; k <= total; k++) {
      const i = (from + k) % total;
      if (countAt(i) < entries[i].num) return i;
    }
    return null;
  };

  /** The words rise into the sky, the next thiker arrives (DESIGN_PLAN §7.3). */
  const complete = (position: number, autoAdvance: boolean) => {
    completing.current = true;
    feel.complete();
    const last = done + 1 >= total;
    if (last) setFinishing(true);
    const ease = { duration: t.rise, easing: motion.easing.drift };
    textOpacity.set(withDelay(t.riseDelay, withTiming(0, ease)));
    textY.set(withDelay(t.riseDelay, withTiming(tier === 'still' ? 0 : -36, ease)));
    if (tier === 'full') {
      glow.set(withSequence(withDelay(150, withTiming(1, { duration: 300 })), withTiming(0, { duration: 600 })));
      const tb = textBox.current;
      const cb = cardBox.current;
      if (tb && cb) motes.current?.lift(cb.x + tb.x + tb.width * 0.2, cb.y + tb.y, tb.width * 0.6, tb.height);
    }
    if (last) cardIn.set(withDelay(300, withTiming(0, { duration: 500, easing: motion.easing.exit })));
    const next = autoAdvance ? nextIncomplete(position) : null;
    setTimeout(() => {
      completing.current = false;
      const target = pendingIndex.current ?? next;
      pendingIndex.current = null;
      if (last) {
        setFinishing(false);
        return;
      }
      if (target !== null && target !== position) useProgress.getState().setIndex(key, target);
      arrive(tier === 'still' ? 0 : 16, t.enter);
      settleUntil.current = Date.now() + SETTLE_MS;
    }, t.next);
  };

  /** One count, from a tap (with its position on the text) or a finished recording. */
  const count = (position: number, source: 'tap' | 'audio', at?: { x: number; y: number }) => {
    const e = entries[position];
    if (!e || countAt(position) >= e.num) return countAt(position);
    const n = useProgress.getState().increment(key, position, e.num);
    if (source === 'tap' && at && tier !== 'still') ripples.current?.spawn(at.x, at.y);
    if (source === 'tap') sound.count();
    if (n >= e.num) complete(position, source === 'tap');
    else if (source === 'tap') {
      if (e.num >= 30 && n % 10 === 0) feel.milestone();
      else feel.count();
    }
    return n;
  };

  const onTap = (x: number, y: number) => {
    if (tab !== 'thiker' || opening || !entry) return;
    if (completing.current || Date.now() < settleUntil.current) return;
    count(index, 'tap', { x, y });
  };

  const audio = useReaderAudio({ entries, index, counts: progress.counts, count: (i) => count(i, 'audio'), goTo });

  useEffect(() => {
    sound.prepare('reader');
    if (play === '1' && state !== 'done') audio.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useAmbient(useIsFocused());

  const hasTranslation = !!entry?.thiker.translations && Object.keys(entry.thiker.translations).length > 0;
  const changeTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    feel.select();
    arrive(tier === 'still' ? 0 : 8, 220);
  };
  const onSwipe = (dir: 'left' | 'right' | 'up' | 'down') => {
    const order: Tab[] = hasTranslation ? ['translation', 'thiker', 'fadl'] : ['thiker', 'fadl'];
    if (dir === 'left' || dir === 'right') {
      const i = order.indexOf(tab) + (dir === 'right' ? 1 : -1);
      if (order[i]) changeTab(order[i]);
    } else if (dir === 'up' && index + 1 < total) goTo(index + 1);
    else if (dir === 'down' && index > 0) goTo(index - 1);
  };

  // Gestures run on the UI thread and call the latest handlers through a ref, so they are built
  // once (and rebuilt only when vertical swiping turns on or off).
  const latest = useRef({ onTap, onSwipe });
  useEffect(() => {
    latest.current = { onTap, onSwipe };
  });
  const callTap = useCallback((x: number, y: number) => latest.current.onTap(x, y), []);
  const callSwipe = useCallback((dir: 'left' | 'right' | 'up' | 'down') => latest.current.onSwipe(dir), []);

  // Swipes are shortcuts only (APP_PLAN §2): tabs and the list do the same with a tap. Vertical
  // swipes only work when the text doesn't scroll, so they never fight the scroll.
  const [scrollable, setScrollable] = useState(false);
  /* eslint-disable react-hooks/refs -- gesture callbacks run on touch events, never during render */
  const gesture = useMemo(() => {
    const tap = Gesture.Tap().maxDistance(12).onEnd((e, success) => {
      if (success) scheduleOnRN(callTap, e.x, e.y);
    });
    const panH = Gesture.Pan().activeOffsetX([-24, 24]).failOffsetY([-16, 16]).onEnd((e) => {
      if (Math.abs(e.translationX) > 60) scheduleOnRN(callSwipe, e.translationX > 0 ? 'right' : 'left');
    });
    const panV = Gesture.Pan().enabled(!scrollable).activeOffsetY([-24, 24]).failOffsetX([-16, 16]).onEnd((e) => {
      if (Math.abs(e.translationY) > 70 && Math.abs(e.velocityY) > 400) scheduleOnRN(callSwipe, e.translationY < 0 ? 'up' : 'down');
    });
    return Gesture.Race(panH, panV, tap);
  }, [scrollable, callTap, callSwipe]);
  /* eslint-enable react-hooks/refs */

  if (!total) return null;
  const title = collections[collectionId].title;

  if (showEnding) {
    return (
      <SkyScreen>
        <TopBar title={title} onMenu={() => setMenuOpen(true)} />
        <Ending
          collectionId={collectionId}
          tier={tier}
          onHome={goBack}
          onRestart={() => {
            useProgress.getState().resetList(key);
            cardIn.set(withTiming(1, { duration: t.enter, easing: motion.easing.enter }));
            arrive(tier === 'still' ? 0 : 16, t.enter);
          }}
        />
        <ReaderMenu visible={menuOpen} onClose={() => setMenuOpen(false)} collectionId={collectionId} entries={entries} />
      </SkyScreen>
    );
  }

  const c = countAt(index);
  const milestone = entry.num >= 30 && c > 0 && c % 10 === 0 && c < entry.num ? c : 0;

  return (
    <SkyScreen>
      <View onLayout={(e) => setBand(e.nativeEvent.layout.height)} style={{ minHeight: band }}>
        <TopBar title={title} onMenu={() => setMenuOpen(true)} />
        <View style={{ flex: 1 }} />
        <Tabs tab={tab} setTab={changeTab} hasTranslation={hasTranslation} />
      </View>

      {opening ? (
        <View style={StyleSheet.absoluteFill}>
          <Opening
            collectionId={collectionId}
            onDone={() => {
              setOpening(false);
              cardIn.set(withTiming(1, { duration: motion.duration.calm, easing: motion.easing.enter }));
            }}
          />
        </View>
      ) : null}

      <Animated.View
        style={[styles.cardWrap, cardStyle]}
        pointerEvents={opening ? 'none' : 'auto'}
        onLayout={(e) => { cardBox.current = e.nativeEvent.layout; }}
      >
        <View style={[styles.card, { backgroundColor: theme.paper, borderColor: theme.paperBorder }]}>
          <Corners color={theme.ornament} />
          <Thread counts={progress.counts} nums={entries.map((e) => e.num)} index={index} tier={tier} onPress={() => setListOpen(true)} />

          <GestureDetector gesture={gesture}>
            <View style={{ flex: 1 }} collapsable={false} onLayout={(e) => { textBox.current = e.nativeEvent.layout; }}>
              <Animated.View pointerEvents="none" style={[styles.glow, { backgroundColor: theme.glow }, glowStyle]} />
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.textWrap}
                onContentSizeChange={(_, h) => setScrollable(h > (textBox.current?.height ?? Infinity) + 4)}
                showsVerticalScrollIndicator={false}
              >
                <Animated.View style={textStyle} accessibilityHint={tab === 'thiker' ? 'اضغط للعد' : undefined}>
                  {tab === 'thiker' ? (
                    <View style={{ gap: space.md }}>
                      <T variant="caption" center color={theme.paperMuted}>{entry.thiker.title}</T>
                      <ThikerText entry={entry} fontSize={fontSize} />
                    </View>
                  ) : tab === 'fadl' ? (
                    <FadlView entry={entry} />
                  ) : (
                    <T center color={theme.paperMuted}>الترجمة قريبًا</T>
                  )}
                </Animated.View>
              </ScrollView>
              <Ripples ref={ripples} color={theme.accent} pool={tier === 'full' ? 3 : 1} />
            </View>
          </GestureDetector>

          {tab === 'thiker' && entry.fadl ? (
            <Pressable onPress={() => changeTab('fadl')} style={styles.teaser} accessibilityRole="button" accessibilityHint="فضل الذكر ودليله">
              <Row gap={6} style={{ justifyContent: 'center' }}>
                <Khatam size={12} color={theme.accent} />
                <T variant="caption" color={theme.paperMuted} numberOfLines={1} style={{ flexShrink: 1 }}>{entry.fadl}</T>
              </Row>
            </Pressable>
          ) : null}

          <Row style={styles.controls}>
            <View style={styles.side}>
              {!audio.open && audio.hasAudio ? (
                <Animated.View entering={FadeIn}>
                  <IconButton name="headset-outline" label="استمع" onPress={audio.start} color={theme.accent} />
                </Animated.View>
              ) : null}
            </View>
            <Pressable
              onPress={() => onTap((textBox.current?.width ?? 300) / 2, (textBox.current?.height ?? 300) - 20)}
              accessibilityRole="button"
              accessibilityLabel={c >= entry.num ? 'اكتمل الذكر' : `المتبقي ${entry.num - c}`}
            >
              <Counter count={c} num={entry.num} tier={tier} milestone={milestone} />
            </Pressable>
            <View style={styles.side}>
              {c > 0 ? (
                <Animated.View entering={FadeIn} exiting={FadeOut}>
                  <IconButton name="refresh" label="إعادة عدّ هذا الذكر" color={theme.paperMuted} onPress={() => useProgress.getState().setCount(key, index, 0)} />
                </Animated.View>
              ) : null}
            </View>
          </Row>
        </View>
      </Animated.View>

      {audio.open ? (
        <Animated.View entering={FadeInUp.duration(motion.duration.base).easing(motion.easing.enter)} exiting={FadeOut.duration(150)} style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          <PlayerBar audio={audio} index={index} total={total} goTo={goTo} />
        </Animated.View>
      ) : null}

      <Motes ref={motes} color={theme.glow} />

      <ReaderMenu visible={menuOpen} onClose={() => setMenuOpen(false)} collectionId={collectionId} entries={entries} />
      <Sheet visible={listOpen} onClose={() => setListOpen(false)} title={title}>
        {entries.map((e, i) => {
          const n = countAt(i);
          const icon = n >= e.num ? 'checkmark-circle' : n > 0 ? 'contrast-outline' : 'ellipse-outline';
          const color = n >= e.num ? theme.success : n > 0 ? theme.accent : theme.border;
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
    </SkyScreen>
  );
}

function TopBar({ title, onMenu }: { title: string; onMenu: () => void }) {
  return (
    <Row style={styles.topbar}>
      <IconButton name="chevron-forward" label="رجوع" onPress={() => goBack()} />
      <T variant="title" center style={{ flex: 1, fontSize: 22, lineHeight: 36 }}>{title}</T>
      <IconButton name="menu" label="الخيارات" onPress={onMenu} />
    </Row>
  );
}

/** Three fixed slots, so «الذكر» stays centred even while the translation tab is hidden. */
function Tabs({ tab, setTab, hasTranslation }: { tab: Tab; setTab: (t: Tab) => void; hasTranslation: boolean }) {
  const theme = useTheme();
  // Right to left: فضل الذكر · الذكر · ترجمة الذكر
  const items: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: 'fadl', label: 'فضل الذكر ودليله' },
    { id: 'thiker', label: 'الذكر' },
    { id: 'translation', label: 'ترجمة الذكر', hidden: !hasTranslation },
  ];
  return (
    <Row style={{ paddingVertical: space.sm, paddingHorizontal: space.lg }} gap={0}>
      {items.map((it) => {
        const active = it.id === tab;
        return (
          <View key={it.id} style={{ flex: 1, alignItems: 'center' }}>
            {it.hidden ? null : (
              <Press onPress={() => setTab(it.id)} hitSlop={8} depth={motion.press.icon} accessibilityRole="tab" accessibilityState={{ selected: active }} style={{ alignItems: 'center' }}>
                <T bold={active} color={active ? theme.text : theme.muted} style={{ fontSize: active ? 16 : 14 }}>{it.label}</T>
                <View style={[styles.tabLine, active && { backgroundColor: theme.text }]} />
              </Press>
            )}
          </View>
        );
      })}
    </Row>
  );
}

/** Small khatam ornaments in the card's corners. */
const Corners = memo(function Corners({ color }: { color: string }) {
  return (
    <>
      {[styles.cornerTR, styles.cornerTL, styles.cornerBR, styles.cornerBL].map((pos, i) => (
        <View key={i} pointerEvents="none" style={[styles.corner, pos]}>
          <Khatam size={18} color={color} />
        </View>
      ))}
    </>
  );
});

function FadlView({ entry }: { entry: ResolvedEntry }) {
  const theme = useTheme();
  const ev = entry.evidence;
  if (!entry.fadl && !ev) {
    return (
      <View style={{ alignItems: 'center', gap: space.md }}>
        <Khatam size={40} color={theme.ornament} />
        <T center color={theme.paperMuted}>لم يُضف فضل هذا الذكر بعد.</T>
      </View>
    );
  }
  const gradeColor = { صحيح: theme.success, حسن: '#3a8f8a', ضعيف: '#b8862f', موضوع: '#c0503f' } as const;
  return (
    <View style={{ gap: space.lg }}>
      {entry.fadl ? (
        <View style={{ gap: space.xs }}>
          <T variant="caption" color={theme.paperMuted}>الفضل</T>
          <T color={theme.paperText} style={{ fontSize: 19, lineHeight: 34 }}>{entry.fadl}</T>
        </View>
      ) : null}
      {entry.fadl && ev ? <View style={{ alignItems: 'center' }}><Khatam size={20} color={theme.ornament} /></View> : null}
      {ev?.text ? (
        <View style={{ gap: space.xs }}>
          <T variant="caption" color={theme.paperMuted}>الدليل</T>
          <T color={theme.paperText} style={{ fontFamily: ATHKAR_FONTS.naskh.family, fontSize: 19, lineHeight: 36 }}>{ev.text}</T>
        </View>
      ) : null}
      {ev?.source || ev?.grade ? (
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {ev.source ? <T color={theme.paperMuted} style={{ flexShrink: 1 }}>{ev.source}</T> : null}
          {ev.grade ? (
            <View style={[styles.grade, { backgroundColor: gradeColor[ev.grade] }]}>
              <T variant="caption" bold color="#ffffff">{ev.grade}{ev.gradeNote ? ` — ${ev.gradeNote}` : ''}</T>
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
  const theme = useTheme();
  const books = booksFor(collectionId);
  const activeBook = resolveBookId(collectionId, settings.bookByCollection[collectionId]);
  const reciterList = recitersFor(entries);
  const sizeIndex = FONT_SIZES.indexOf(settings.fontSize);
  const font = ATHKAR_FONTS[settings.athkarFont];

  return (
    <Sheet visible={visible} onClose={onClose} title="الخيارات">
      {books.length > 1 ? (
        <Card alt style={{ gap: space.sm }}>
          <T variant="heading">الكتاب</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {books.map((b) => (
              <Pill key={b.id} label={b.name} active={activeBook === b.id} onPress={() => settings.setBook(collectionId, b.id)} />
            ))}
          </Row>
        </Card>
      ) : null}
      <Card alt style={{ gap: space.sm }}>
        <T variant="heading">خط الأذكار</T>
        <Row style={{ flexWrap: 'wrap' }}>
          {(Object.keys(ATHKAR_FONTS) as AthkarFont[]).map((f) => (
            <Pill key={f} label={ATHKAR_FONTS[f].label} active={settings.athkarFont === f} onPress={() => settings.set({ athkarFont: f })} />
          ))}
        </Row>
        <T center color={theme.text} style={{ fontFamily: font.family, fontSize: settings.fontSize, lineHeight: settings.fontSize * 1.9 }}>
          سُبْحَانَ اللَّهِ وَبِحَمْدِهِ
        </T>
        <Row>
          <IconButton name="remove" label="تصغير الخط" onPress={() => sizeIndex > 0 && settings.set({ fontSize: FONT_SIZES[sizeIndex - 1] })} />
          <T variant="heading" center style={{ flex: 1 }}>{toArabicDigits(settings.fontSize)}</T>
          <IconButton name="add" label="تكبير الخط" onPress={() => sizeIndex < FONT_SIZES.length - 1 && settings.set({ fontSize: FONT_SIZES[sizeIndex + 1] })} />
        </Row>
        <T variant="caption" muted center>آيات القرآن بخط مصحف المدينة دائمًا.</T>
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
  topbar: { paddingHorizontal: space.sm, paddingTop: space.xs, justifyContent: 'space-between' },
  cardWrap: { flex: 1, paddingHorizontal: space.lg, paddingBottom: space.md },
  card: {
    flex: 1, borderRadius: radius.card, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md,
    borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  glow: { position: 'absolute', left: '15%', right: '15%', top: '25%', bottom: '25%', borderRadius: 999 },
  tabLine: { width: 22, height: 2, borderRadius: 1, marginTop: 4 },
  textWrap: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.lg },
  teaser: { paddingVertical: space.xs, paddingHorizontal: space.lg },
  controls: { justifyContent: 'space-between', paddingTop: space.xs },
  side: { width: 48, alignItems: 'center' },
  listRow: { paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.sm },
  grade: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill },
  corner: { position: 'absolute', opacity: 0.9 },
  cornerTR: { top: 8, right: 8 },
  cornerTL: { top: 8, left: 8 },
  cornerBR: { bottom: 8, right: 8 },
  cornerBL: { bottom: 8, left: 8 },
});
