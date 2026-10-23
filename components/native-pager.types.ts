import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface NativePagerProps<T> {
  data: readonly T[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  keyExtractor: (item: T, index: number) => string;
  renderPage: (item: T, index: number) => ReactNode;
  style?: StyleProp<ViewStyle>;
}
