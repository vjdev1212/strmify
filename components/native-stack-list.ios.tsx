import { Fragment } from 'react';
import { Host } from '@expo/ui';
import { RNHostView, ScrollView, HStack, VStack } from '@expo/ui/swift-ui';
import { View as RNView } from 'react-native';
import type { NativeStackListProps } from './native-stack-list.types';

export default function NativeStackList<T>({
  data,
  axis,
  spacing = 0,
  horizontalContentInset = 0,
  scrollable = true,
  nativeItems = false,
  keyExtractor,
  renderItem,
  style,
}: NativeStackListProps<T>) {
  const items = data.map((item, index) => {
    const key = keyExtractor(item, index);
    const content = renderItem(item, index);
    return nativeItems ? (
      <Fragment key={key}>{content}</Fragment>
    ) : (
      <RNHostView key={key} matchContents={axis === 'vertical' ? { vertical: true } : true}>
        <>{content}</>
      </RNHostView>
    );
  });

  const insetSpacerWidth = Math.max(0, horizontalContentInset - spacing);
  const leadingInset = axis === 'horizontal' && horizontalContentInset > 0 ? (
    <RNHostView key="leading-inset" matchContents>
      <RNView style={{ width: insetSpacerWidth, height: 1 }} />
    </RNHostView>
  ) : null;
  const trailingInset = axis === 'horizontal' && horizontalContentInset > 0 ? (
    <RNHostView key="trailing-inset" matchContents>
      <RNView style={{ width: insetSpacerWidth, height: 1 }} />
    </RNHostView>
  ) : null;

  const stack = axis === 'horizontal'
    ? <HStack spacing={spacing}>{leadingInset}{items}{trailingInset}</HStack>
    : <VStack alignment="leading" spacing={spacing}>{items}</VStack>;

  return (
    <Host
      matchContents={!scrollable}
      useViewportSizeMeasurement={scrollable && axis === 'vertical'}
      style={[{ width: '100%', flex: scrollable && axis === 'vertical' ? 1 : undefined }, style]}
    >
      {scrollable ? (
        <ScrollView axes={axis} showsIndicators={false}>{stack}</ScrollView>
      ) : stack}
    </Host>
  );
}
