import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SkyScreen } from '@/components/Sky';
import { TopBar } from '@/components/TopBar';
import { Press, Row, T } from '@/components/ui';
import { searchSections, sectionGroups } from '@/content';
import { openSection } from '@/lib/navigate';
import { useTheme } from '@/hooks';
import { useTier } from '@/lib/quality';
import { useSkyScene } from '@/store/sky';
import { fonts, motion, radius, space } from '@/theme';

/** «جميع الأذكار»: every section, grouped, with a search over titles and words. */
export default function Sections() {
  useSkyScene({ kind: 'clock' });
  const theme = useTheme();
  const tier = useTier();
  const groups = useMemo(() => sectionGroups(), []);
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchSections(query), [query]);
  const enter = (i: number) => (tier === 'still' ? undefined : FadeInDown.delay(40 * i).duration(motion.duration.base).easing(motion.easing.enter));

  return (
    <SkyScreen>
      <TopBar title="جميع الأذكار" action={{ icon: 'library-outline', label: 'المكتبة', onPress: () => router.push('/library') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Row style={[styles.search, { backgroundColor: theme.glass, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث في الأقسام والأذكار…"
            placeholderTextColor={theme.muted}
            style={[styles.input, { color: theme.text, fontFamily: fonts.regular }]}
            accessibilityLabel="بحث"
          />
        </Row>

        {query.trim() ? (
          results.length ? (
            results.map((r) => (
              <Press key={r.id} onPress={() => openSection(r.id, r.kind)} depth={motion.press.card} style={[styles.result, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                <T variant="heading">{r.title}</T>
                {r.match ? <T variant="caption" muted numberOfLines={1}>فيه: {r.match}</T> : null}
              </Press>
            ))
          ) : (
            <T muted center style={{ marginTop: space.xl }}>لا نتائج.</T>
          )
        ) : (
          groups.map((g, gi) => (
            <Animated.View key={g.id} entering={enter(gi)} style={{ gap: space.sm }}>
              <T variant="heading" style={{ fontFamily: fonts.title, fontSize: 19, marginTop: space.sm }}>{g.title}</T>
              <View style={styles.grid}>
                {g.sections.map((s) => (
                  <Press key={s.id} onPress={() => openSection(s.id, s.kind)} depth={motion.press.card} containerStyle={styles.cell}
                    style={[styles.tile, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                    <T style={{ lineHeight: 24 }}>{s.title}</T>
                    {s.kind === 'wird' ? <T variant="caption" color={theme.accent}>وِرد يومي</T> : null}
                  </Press>
                ))}
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SkyScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },
  search: { borderRadius: radius.md, paddingHorizontal: space.md, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, paddingVertical: space.md, fontSize: 16, textAlign: 'right', writingDirection: 'rtl' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: space.sm },
  cell: { width: '48.5%' },
  tile: { minHeight: 72, borderRadius: radius.md, padding: space.md, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', gap: 2 },
  result: { borderRadius: radius.md, padding: space.md, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
});
