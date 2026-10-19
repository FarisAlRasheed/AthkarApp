import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Khatam } from '@/components/Khatam';
import { FadlView } from '@/components/reader/FadlView';
import { ThikerText } from '@/components/reader/ThikerText';
import { Press, Row, T } from '@/components/ui';
import type { ListItem } from '@/content';
import { useTheme } from '@/hooks';
import { timesLabel, toArabicDigits } from '@/lib/arabic';
import { feel } from '@/lib/feel';
import { useTier } from '@/lib/quality';
import { useSettings } from '@/store/settings';
import { fonts, motion, radius, space } from '@/theme';

type ListRow = { kind: 'heading'; title: string; key: string } | { kind: 'item'; item: ListItem; key: string };

/** Chapter headings between items, shown only where the chapter changes (and only if there is more than one). */
function withHeadings(items: ListItem[]): ListRow[] {
  const chapters = new Set(items.map((i) => i.chapter));
  const rows: ListRow[] = [];
  let last: string | undefined;
  items.forEach((item, i) => {
    if (chapters.size > 1 && item.chapter !== last) rows.push({ kind: 'heading', title: item.chapter, key: `h${i}` });
    last = item.chapter;
    rows.push({ kind: 'item', item, key: `i${i}` });
  });
  return rows;
}

/**
 * A reading list (a section that is read, not a counted wird, or a chapter in the library): every
 * thiker on its own paper card. Tapping a card counts it down — just for now, nothing is saved.
 */
export function ListReader({ items, header, footer }: { items: ListItem[]; header?: React.ReactElement; footer?: React.ReactElement }) {
  const rows = withHeadings(items);
  const tier = useTier();
  const renderItem = useCallback(({ item: row, index }: { item: ListRow; index: number }) => {
    const enter = tier === 'still' || index > 8 ? undefined : FadeInDown.delay(40 * index).duration(motion.duration.base).easing(motion.easing.enter);
    return (
      <Animated.View entering={enter}>
        {row.kind === 'heading' ? <Heading title={row.title} /> : row.item.type === 'guide' ? <GuideCard item={row.item} /> : <ThikerCard item={row.item} />}
      </Animated.View>
    );
  }, [tier]);
  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.key}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      initialNumToRender={6}
      windowSize={7}
    />
  );
}

function Heading({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <Row gap={space.sm} style={styles.heading}>
      <Khatam size={14} color={theme.accent} />
      <T variant="heading" style={{ fontFamily: fonts.title, fontSize: 18, flex: 1 }}>{title}</T>
    </Row>
  );
}

const ThikerCard = memo(function ThikerCard({ item }: { item: Extract<ListItem, { type: 'thiker' }> }) {
  const theme = useTheme();
  const fontSize = useSettings((s) => s.fontSize);
  const [left, setLeft] = useState(item.num);
  const [open, setOpen] = useState(false);
  const hasFadl = !!(item.fadl || item.evidence);
  const done = left === 0;

  const count = () => {
    if (done) return setLeft(item.num);
    if (left === 1) feel.complete();
    else feel.count();
    setLeft(left - 1);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.paper, borderColor: done ? theme.glow : theme.paperBorder }]}>
      <Press onPress={count} depth={motion.press.card} accessibilityHint={item.num > 1 ? 'اضغط للعد' : undefined} style={{ gap: space.sm }}>
        {item.note ? <T variant="caption" center color={theme.accent}>{item.note}</T> : null}
        <ThikerText entry={item} fontSize={Math.max(18, fontSize - 4)} />
      </Press>
      <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
        {hasFadl ? (
          <Press onPress={() => setOpen(!open)} depth={motion.press.icon} hitSlop={8} accessibilityLabel={open ? 'إخفاء الفضل والدليل' : 'الفضل والدليل'}>
            <Row gap={6}>
              <Khatam size={12} color={theme.accent} />
              <T variant="caption" color={theme.paperMuted}>الفضل والدليل</T>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.paperMuted} />
            </Row>
          </Press>
        ) : <View />}
        {item.num > 1 || done ? (
          <View style={[styles.count, { backgroundColor: done ? theme.success : theme.surfaceAlt }]}>
            {done ? (
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            ) : (
              <T variant="caption" bold color={theme.paperText}>{left === item.num ? timesLabel(item.num) : toArabicDigits(left)}</T>
            )}
          </View>
        ) : null}
      </Row>
      {open ? (
        <Animated.View entering={FadeIn.duration(motion.duration.quick)} style={[styles.fadl, { borderTopColor: theme.paperBorder }]}>
          <FadlView entry={item} compact />
        </Animated.View>
      ) : null}
    </View>
  );
});

const GuideCard = memo(function GuideCard({ item }: { item: Extract<ListItem, { type: 'guide' }> }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const hasSource = !!(item.evidence?.source);
  return (
    <View style={[styles.guide, { borderColor: theme.border, backgroundColor: theme.glass }]}>
      <Row gap={space.sm} style={{ alignItems: 'flex-start' }}>
        <Ionicons name="information-circle-outline" size={18} color={theme.muted} style={{ marginTop: 3 }} />
        <T style={{ flex: 1, lineHeight: 26 }}>{item.guide}</T>
      </Row>
      {hasSource ? (
        <Press onPress={() => setOpen(!open)} depth={motion.press.icon} hitSlop={8} style={{ alignSelf: 'flex-end' }} accessibilityLabel="الدليل">
          <T variant="caption" muted>{open ? 'إخفاء الدليل' : 'الدليل'}</T>
        </Press>
      ) : null}
      {open ? <T variant="caption" muted>{[item.evidence?.source, item.evidence?.grade].filter(Boolean).join(' — ')}</T> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },
  heading: { marginTop: space.md },
  card: { borderRadius: radius.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth },
  count: { minWidth: 32, height: 26, paddingHorizontal: space.sm, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  fadl: { marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  guide: { borderRadius: radius.md, padding: space.md, gap: space.xs, borderWidth: StyleSheet.hairlineWidth },
});
