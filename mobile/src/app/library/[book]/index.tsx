import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';
import { SkyScreen } from '@/components/Sky';
import { TopBar } from '@/components/TopBar';
import { Press, Row, T } from '@/components/ui';
import { getBook } from '@/content';
import { useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import { useSkyScene } from '@/store/sky';
import { motion, radius, space } from '@/theme';

/** A book's table of contents, in its author's order. */
export default function BookIndex() {
  const { book } = useLocalSearchParams<{ book: string }>();
  useSkyScene({ kind: 'clock' });
  const theme = useTheme();
  const b = getBook(book);
  if (!b) return <Redirect href="/library" />;

  return (
    <SkyScreen>
      <TopBar title={b.title ?? b.author ?? ''} />
      {b.title && b.author ? <T variant="caption" muted center style={{ marginBottom: space.sm }}>{b.author}</T> : null}
      <FlatList
        data={b.chapters}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.content}
        initialNumToRender={20}
        renderItem={({ item, index }) => (
          <Press onPress={() => router.push(`/library/${book}/${index}`)} depth={motion.press.card} style={[styles.row, { backgroundColor: theme.glass, borderColor: theme.border }]}>
            <Row gap={space.md}>
              <T variant="caption" muted style={styles.num}>{toArabicDigits(index + 1)}</T>
              <T style={{ flex: 1, lineHeight: 26 }}>{item.title}</T>
            </Row>
          </Press>
        )}
      />
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, gap: space.sm, paddingBottom: space.xxl * 2 },
  row: { borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.md, borderWidth: StyleSheet.hairlineWidth },
  num: { minWidth: 28, textAlign: 'center' },
});
