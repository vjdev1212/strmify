import { useEffect, useRef } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import type { NativePagerProps } from './native-pager.types';

export default function NativePager<T>({
  data,
  activeIndex,
  onIndexChange,
  keyExtractor,
  renderPage,
  style,
}: NativePagerProps<T>) {
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ x: activeIndex * width, animated: true });
  }, [activeIndex, width]);

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={style}
      onMomentumScrollEnd={(event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        if (index !== activeIndex && index >= 0 && index < data.length) onIndexChange(index);
      }}
    >
      {data.map((item, index) => (
        <View key={keyExtractor(item, index)} style={{ width }}>
          {renderPage(item, index)}
        </View>
      ))}
    </ScrollView>
  );
}
