import { memo } from 'react';
import { View } from 'react-native';
import { T } from '@/components/ui';
import { quran, type ResolvedEntry } from '@/content';
import { useTheme } from '@/hooks';
import { useSettings } from '@/store/settings';
import { ATHKAR_FONTS, fonts, space } from '@/theme';

// The KFGQPC face draws smaller than the naskh faces at the same size.
const QURAN_SCALE = 1.12;

/**
 * A thiker's words. Quranic text (from KFGQPC, content/quran.json) is drawn in the King Fahd Hafs
 * font, which turns «۝١» into verse marks, with the basmalah on its own line; everything else uses
 * the reader's chosen athkar font (DESIGN_PLAN §2.4).
 */
export const ThikerText = memo(function ThikerText({ entry, fontSize }: { entry: ResolvedEntry; fontSize: number }) {
  const theme = useTheme();
  const athkarFont = useSettings((s) => s.athkarFont);
  const t = entry.thiker;

  if (t.quran && t.ayahs) {
    const size = fontSize * QURAN_SCALE;
    return (
      <View style={{ gap: space.sm }}>
        <T variant="caption" center color={theme.quran} accessibilityRole="text">من القرآن</T>
        {t.basmalah ? (
          <T center color={theme.paperText} style={{ fontFamily: fonts.quran, fontSize: size * 0.85, lineHeight: size * 1.9 }}>
            {quran.basmalah}
          </T>
        ) : null}
        <T center color={theme.paperText} style={{ fontFamily: fonts.quran, fontSize: size, lineHeight: size * 2.05 }}>
          {t.text}
        </T>
      </View>
    );
  }

  return (
    <T center color={theme.paperText} style={{ fontFamily: ATHKAR_FONTS[athkarFont].family, fontSize, lineHeight: fontSize * 2 }}>
      {t.text}
    </T>
  );
});
