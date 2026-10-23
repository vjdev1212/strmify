import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type NativeStackAxis = 'horizontal' | 'vertical';

export interface NativeStackListProps<T> {
  data: readonly T[];
  axis: NativeStackAxis;
  spacing?: number;
  horizontalContentInset?: number;
  scrollable?: boolean;
  nativeItems?: boolean;
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  style?: StyleProp<ViewStyle>;
}
