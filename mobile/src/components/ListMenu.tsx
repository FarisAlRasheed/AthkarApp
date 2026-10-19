import { Sheet } from '@/components/Sheet';
import { Card, IconButton, Pill, Row, T } from '@/components/ui';
import { booksFor } from '@/content';
import { toArabicDigits } from '@/lib/arabic';
import { FONT_SIZES, useSettings } from '@/store/settings';
import { space } from '@/theme';

/** The book this list is read from, and the text size. */
export function ListMenu({ visible, onClose, sectionId, bookId }: { visible: boolean; onClose: () => void; sectionId?: string; bookId: string }) {
  const settings = useSettings();
  const books = sectionId ? booksFor(sectionId) : [];
  const sizeIndex = FONT_SIZES.indexOf(settings.fontSize);
  return (
    <Sheet visible={visible} onClose={onClose} title="الخيارات">
      {sectionId && books.length > 1 ? (
        <Card alt style={{ gap: space.sm }}>
          <T variant="heading">الكتاب</T>
          <Row style={{ flexWrap: 'wrap' }}>
            {books.map((b) => (
              <Pill key={b.id} label={b.name} active={bookId === b.id} onPress={() => settings.setBook(sectionId, b.id)} />
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
    </Sheet>
  );
}
