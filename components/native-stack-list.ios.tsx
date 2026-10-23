import { Host } from '@expo/ui';
import { RNHostView, ScrollView, HStack, VStack } from '@expo/ui/swift-ui';
import type { NativeStackListProps } from './native-stack-list.types';

export default function NativeStackList<T>({
  data,
  axis,
  spacing = 0,
  scrollable = true,
  keyExtractor,
  renderItem,
  style,
}: NativeStackListProps<T>) {
  const items = data.map((item, index) => (
    <RNHostView key={keyExtractor(item, index)} matchContents>
      <>{renderItem(item, index)}</>
    </RNHostView>
  ));

  const stack = axis === 'horizontal'
    ? <HStack spacing={spacing}>{items}</HStack>
    : <VStack spacing={spacing}>{items}</VStack>;

  return (
    <Host matchContents style={[{ width: '100%' }, style]}>
      {scrollable ? (
        <ScrollView axes={axis} showsIndicators={false}>{stack}</ScrollView>
      ) : stack}
    </Host>
  );
}
