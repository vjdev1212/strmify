import { Host, RNHostView, ScrollView, Row } from '@expo/ui';
import type { NativePagerProps } from './native-pager.types';

export default function NativePager<T>({
  data,
  activeIndex: _activeIndex,
  onIndexChange: _onIndexChange,
  keyExtractor,
  renderPage,
  style,
}: NativePagerProps<T>) {
  return (
    <Host style={style}>
      <ScrollView direction="horizontal" showsIndicators={false}>
        <Row>
          {data.map((item, index) => (
            <RNHostView key={keyExtractor(item, index)} matchContents>
              <>{renderPage(item, index)}</>
            </RNHostView>
          ))}
        </Row>
      </ScrollView>
    </Host>
  );
}
