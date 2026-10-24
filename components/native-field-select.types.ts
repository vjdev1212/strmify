export interface NativeFieldSelectProps<T extends string | number> {
  label?: string;
  selectedValue: T;
  onValueChange: (value: T) => void;
  options: { label: string; value: T }[];
  enabled?: boolean;
}
