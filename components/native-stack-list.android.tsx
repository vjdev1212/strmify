import { Host, RNHostView, ScrollView, Row, Column } from '@expo/ui';
import { View as RNView } from 'react-native';
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
  const items = data.map((item, index) => (
    <RNHostView
      key={keyExtractor(item, index)}
      matchContents={axis === 'vertical' ? { vertical: true } : true}
    >
      <>{renderItem(item, index)}</>
    </RNHostView>
  ));

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
