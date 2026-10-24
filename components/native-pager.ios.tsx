import { Host, RNHostView } from '@expo/ui';
import { TabView } from '@expo/ui/swift-ui';
import { tabViewStyle } from '@expo/ui/swift-ui/modifiers';
import type { NativePagerProps } from './native-pager.types';

export default function NativePager<T>({
  data,
  activeIndex,
  onIndexChange,
  keyExtractor,
  renderPage,
  style,
}: NativePagerProps<T>) {
  return (
    <Host style={style}>
      <TabView
        selection={String(activeIndex)}
        onSelectionChange={(selection) => onIndexChange(Number(selection))}
        modifiers={[tabViewStyle({ type: 'page', indexDisplayMode: 'never' })]}
      >
        {data.map((item, index) => (
          <TabView.Tab key={keyExtractor(item, index)} value={String(index)}>
            <RNHostView matchContents>
              <>{renderPage(item, index)}</>
            </RNHostView>
          </TabView.Tab>
        ))}
      </TabView>
    </Host>
  );
}
