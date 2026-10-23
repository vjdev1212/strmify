import { useEffect, useRef } from 'react';
import { Host, RNHostView } from '@expo/ui';
import { HorizontalPager } from '@expo/ui/jetpack-compose';
import type { HorizontalPagerHandle } from '@expo/ui/jetpack-compose';
import type { NativePagerProps } from './native-pager.types';

export default function NativePager<T>({
  data,
  activeIndex,
  onIndexChange,
  keyExtractor,
  renderPage,
  style,
}: NativePagerProps<T>) {
  const pagerRef = useRef<HorizontalPagerHandle>(null);
  const visiblePageRef = useRef(activeIndex);

  useEffect(() => {
    if (activeIndex === visiblePageRef.current || !pagerRef.current) return;
    pagerRef.current.animateScrollToPage(activeIndex)
      .then(() => {
        visiblePageRef.current = activeIndex;
      })
      .catch((error: unknown) => {
        console.error('Failed to change native carousel page:', error);
      });
  }, [activeIndex]);

  return (
    <Host style={style}>
      <HorizontalPager
        ref={pagerRef}
        initialPage={activeIndex}
        onCurrentPageChange={(page) => {
          visiblePageRef.current = page;
          onIndexChange(page);
        }}
        beyondViewportPageCount={1}
      >
        {data.map((item, index) => (
          <RNHostView key={keyExtractor(item, index)} matchContents>
            <>{renderPage(item, index)}</>
          </RNHostView>
        ))}
      </HorizontalPager>
    </Host>
  );
}
