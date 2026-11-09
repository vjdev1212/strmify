import { Fragment } from 'react';
import { Column, Host, RNHostView, Row, ScrollView } from '@expo/ui';
import { FlatList, View as RNView } from 'react-native';
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
  if (axis === 'horizontal') {
    const renderHorizontalItem = ({ item, index }: { item: T; index: number }) => (
      nativeItems ? renderItem(item, index) : <RNView>{renderItem(item, index)}</RNView>
    );

    if (!scrollable) {
      return (
        <RNView style={[{ flexDirection: 'row', gap: spacing, paddingHorizontal: horizontalContentInset }, style]}>
          {data.map((item, index) => (
            <RNView key={keyExtractor(item, index)}>{renderItem(item, index)}</RNView>
          ))}
        </RNView>
      );
    }

    return (
      <FlatList
        horizontal
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderHorizontalItem}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        showsHorizontalScrollIndicator={false}
        style={[{ flexGrow: 0, flexShrink: 0 }, style]}
        contentContainerStyle={{ gap: spacing, paddingHorizontal: horizontalContentInset }}
      />
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

  const stack = <Column spacing={spacing}>{items}</Column>;

  return (
    <Host
      matchContents={!scrollable}
      useViewportSizeMeasurement={scrollable && axis === 'vertical'}
      style={[{ width: '100%', flex: scrollable && axis === 'vertical' ? 1 : undefined }, style]}
    >
      {scrollable ? <ScrollView direction="vertical" showsIndicators={false}>{stack}</ScrollView> : stack}
    </Host>
  );
}
