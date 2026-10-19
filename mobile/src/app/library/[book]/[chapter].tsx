import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ListMenu } from '@/components/ListMenu';
import { ListReader } from '@/components/ListReader';
import { SkyScreen } from '@/components/Sky';
import { TopBar } from '@/components/TopBar';
import { Button, T } from '@/components/ui';
import { bookName, getBook, getChapter } from '@/content';
import { useScreenAwake } from '@/hooks';
import { useSkyScene } from '@/store/sky';
import { space } from '@/theme';

/** One chapter of a book, read as a list; the next chapter is a tap away at the bottom. */
export default function BookChapter() {
  const { book, chapter } = useLocalSearchParams<{ book: string; chapter: string }>();
  useSkyScene({ kind: 'clock' });
  useScreenAwake();
  const [menu, setMenu] = useState(false);
  const index = Number(chapter);
  const data = useMemo(() => getChapter(book, index), [book, index]);
  const total = getBook(book)?.chapters.length ?? 0;
  if (!data) return <Redirect href={`/library/${book}`} />;

  const footer = (
    <View style={styles.footer}>
      {index + 1 < total ? (
        <Button kind="secondary" label="الباب التالي" icon="chevron-back" onPress={() => router.replace(`/library/${book}/${index + 1}`)} />
      ) : null}
      <T variant="caption" muted center>{bookName(book)}</T>
    </View>
  );

  return (
    <SkyScreen>
      <TopBar title={data.title} action={{ icon: 'menu', label: 'الخيارات', onPress: () => setMenu(true) }} />
      <ListReader items={data.items} footer={footer} />
      <ListMenu visible={menu} onClose={() => setMenu(false)} bookId={book} />
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: space.md, marginTop: space.lg },
});
