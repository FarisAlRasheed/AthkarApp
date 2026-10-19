import { StyleSheet, View } from 'react-native';
import { Khatam } from '@/components/Khatam';
import { Row, T } from '@/components/ui';
import type { Evidence } from '@/content';
import { useTheme } from '@/hooks';
import { ATHKAR_FONTS, radius, space } from '@/theme';

/** «فضل الذكر ودليله»: the virtue, the narration, its source and grade. Drawn on the reading paper. */
export function FadlView({ entry, compact }: { entry: { fadl?: string; evidence?: Evidence }; compact?: boolean }) {
  const theme = useTheme();
  const ev = entry.evidence;
  if (!entry.fadl && !ev) {
    if (compact) return null;
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

const styles = StyleSheet.create({
  grade: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill },
});
