import { Column, Host, RNHostView, Row, ScrollView } from '@expo/ui';
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
    ? <Row spacing={spacing}>{items}</Row>
    : <Column spacing={spacing}>{items}</Column>;

  return (
    <Host matchContents style={[{ width: '100%' }, style]}>
      {scrollable ? (
        <ScrollView direction={axis} showsIndicators={false}>{stack}</ScrollView>
      ) : stack}
    </Host>
  );
}
