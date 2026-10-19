import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import type Ionicons from '@expo/vector-icons/Ionicons';
import { IconButton, Row, T } from '@/components/ui';
import { goBack } from '@/hooks';
import { space } from '@/theme';

/** Back on the right (Arabic convention), the title centred, an optional action on the left. */
export function TopBar({ title, action }: {
  title: string;
  action?: { icon: ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void };
}) {
  return (
    <Row style={styles.bar}>
      <IconButton name="chevron-forward" label="رجوع" onPress={() => goBack()} />
      <T variant="title" center numberOfLines={1} style={{ flex: 1, fontSize: 22, lineHeight: 36 }}>{title}</T>
      {action ? <IconButton name={action.icon} label={action.label} onPress={action.onPress} /> : <View style={{ width: 44 }} />}
    </Row>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: space.sm, paddingTop: space.xs, justifyContent: 'space-between' },
});
