import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks';
import { radius, space } from '@/theme';
import { IconButton, Row, T } from './ui';

export function Sheet({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="إغلاق" />
      <View style={[styles.sheet, { backgroundColor: theme.sheet, paddingBottom: insets.bottom + space.lg }]}>
        <Row style={{ justifyContent: 'space-between', marginBottom: space.sm }}>
          <T variant="heading">{title}</T>
          <IconButton name="close" label="إغلاق" onPress={onClose} />
        </Row>
        <ScrollView contentContainerStyle={{ gap: space.md }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { maxHeight: '75%', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg },
});
