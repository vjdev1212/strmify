import { ScrollView, View } from 'react-native';
import type { NativeStackListProps } from './native-stack-list.types';

export default function NativeStackList<T>({
  data,
  axis,
  spacing = 0,
  horizontalContentInset = 0,
  scrollable = true,
  keyExtractor,
  renderItem,
  style,
}: NativeStackListProps<T>) {
  const children = data.map((item, index) => (
    <View key={keyExtractor(item, index)}>{renderItem(item, index)}</View>
  ));
  const contentStyle = {
    flexDirection: axis === 'horizontal' ? 'row' as const : 'column' as const,
    gap: spacing,
    paddingHorizontal: axis === 'horizontal' ? horizontalContentInset : 0,
  };

  return scrollable ? (
    <ScrollView
      horizontal={axis === 'horizontal'}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      style={[{ width: '100%' }, style]}
      contentContainerStyle={contentStyle}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ width: '100%' }, style, contentStyle]}>{children}</View>
  );
}
