import { Picker } from '@expo/ui';
import type { NativeFieldSelectProps } from '@/components/native-field-select.types';

export default function NativeFieldSelect<T extends string | number>({
  selectedValue,
  onValueChange,
  options,
  enabled = true,
}: NativeFieldSelectProps<T>) {
  return (
    <Picker selectedValue={selectedValue} onValueChange={onValueChange} appearance="menu" enabled={enabled}>
      {options.map((option) => (
        <Picker.Item key={option.value} label={option.label} value={option.value} />
      ))}
    </Picker>
  );
}
