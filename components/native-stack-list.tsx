import { Fragment } from 'react';
import { Column, Host, RNHostView, Row, ScrollView } from '@expo/ui';
import { ScrollView as RNScrollView, View as RNView } from 'react-native';
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
  if (axis === 'horizontal' && !nativeItems) {
    const horizontalItems = data.map((item, index) => (
      <RNView key={keyExtractor(item, index)}>{renderItem(item, index)}</RNView>
    ));
    if (!scrollable) {
      return (
        <RNView style={[{ flexDirection: 'row', gap: spacing, paddingHorizontal: horizontalContentInset }, style]}>
          {horizontalItems}
        </RNView>
      );
    }

    return (
      <RNScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[{ flexGrow: 0, flexShrink: 0 }, style]}
        contentContainerStyle={{
          alignItems: 'flex-start',
          gap: spacing,
          paddingHorizontal: horizontalContentInset,
        }}
      >
        {horizontalItems}
      </RNScrollView>
    );
  }

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
    ? <Row spacing={spacing}>{leadingInset}{items}{trailingInset}</Row>
    : <Column spacing={spacing}>{items}</Column>;

  return (
    <Host
      matchContents={!scrollable}
      useViewportSizeMeasurement={scrollable && axis === 'vertical'}
      style={[{ width: '100%', flex: scrollable && axis === 'vertical' ? 1 : undefined }, style]}
    >
      {scrollable ? (
        <ScrollView direction={axis} showsIndicators={false}>{stack}</ScrollView>
      ) : stack}
    </Host>
  );
}
