import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Khatam } from '@/components/Khatam';
import { SkyScreen } from '@/components/Sky';
import { TopBar } from '@/components/TopBar';
import { Press, Row, T } from '@/components/ui';
import { libraryBooks } from '@/content';
import { useTheme } from '@/hooks';
import { toArabicDigits } from '@/lib/arabic';
import { useTier } from '@/lib/quality';
import { useSkyScene } from '@/store/sky';
import { fonts, motion, radius, space } from '@/theme';

/** «بابان»، «١٠ أبواب»، «١٣٠ بابًا». */
const chaptersLabel = (n: number) => (n === 1 ? 'باب واحد' : n === 2 ? 'بابان' : `${toArabicDigits(n)} ${n <= 10 ? 'أبواب' : 'بابًا'}`);

/** «المكتبة»: the books the athkar come from, each read as its author ordered it. */
export default function Library() {
  useSkyScene({ kind: 'clock' });
  const theme = useTheme();
  const tier = useTier();
  return (
    <SkyScreen>
      <TopBar title="المكتبة" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {libraryBooks().map((b, i) => (
          <Animated.View key={b.id} entering={tier === 'still' ? undefined : FadeInDown.delay(60 * i).duration(motion.duration.base).easing(motion.easing.enter)}>
            <Press onPress={() => router.push(`/library/${b.id}`)} depth={motion.press.card} style={[styles.book, { backgroundColor: theme.paper, borderColor: theme.paperBorder }]}>
              <Row gap={space.md}>
                <View style={[styles.spine, { backgroundColor: theme.accent }]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T color={theme.paperText} style={{ fontFamily: fonts.title, fontSize: 22, lineHeight: 36 }}>{b.title}</T>
                  {b.author ? <T variant="caption" color={theme.paperMuted}>{b.author}</T> : null}
                  <T variant="caption" color={theme.paperMuted}>{chaptersLabel(b.chapters)}</T>
                </View>
                <Khatam size={22} color={theme.ornament} />
                <Ionicons name="chevron-back" size={18} color={theme.paperMuted} />
              </Row>
            </Press>
          </Animated.View>
        ))}
      </ScrollView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },
  book: { borderRadius: radius.lg, paddingVertical: space.lg, paddingHorizontal: space.md, borderWidth: StyleSheet.hairlineWidth },
  spine: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
});
