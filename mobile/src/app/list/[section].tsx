import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ListReader } from '@/components/ListReader';
import { ListMenu } from '@/components/ListMenu';
import { SkyScreen } from '@/components/Sky';
import { TopBar } from '@/components/TopBar';
import { getList, resolveBookId, sections } from '@/content';
import { useScreenAwake } from '@/hooks';
import { useSettings } from '@/store/settings';
import { useSkyScene } from '@/store/sky';

/** A section that is read rather than counted (دعاء السفر، أذكار المسجد…), in the chosen book. */
export default function SectionList() {
  const { section } = useLocalSearchParams<{ section: string }>();
  useSkyScene({ kind: 'clock' });
  useScreenAwake();
  const preferred = useSettings((s) => s.bookByCollection[section]);
  const [menu, setMenu] = useState(false);
  const meta = sections[section];
  const bookId = meta ? resolveBookId(section, preferred) : undefined;
  const items = useMemo(() => (bookId ? getList(section, bookId) : []), [section, bookId]);

  if (!meta || !bookId) return <Redirect href="/sections" />;
  if (meta.kind === 'wird') return <Redirect href={`/read/${section}`} />;

  return (
    <SkyScreen>
      <TopBar title={meta.title} action={{ icon: 'menu', label: 'الخيارات', onPress: () => setMenu(true) }} />
      <ListReader items={items} />
      <ListMenu visible={menu} onClose={() => setMenu(false)} sectionId={section} bookId={bookId} />
    </SkyScreen>
  );
}
