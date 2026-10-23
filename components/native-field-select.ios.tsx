import { Picker, Text } from '@expo/ui/swift-ui';
import { disabled, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import type { NativeFieldSelectProps } from '@/components/native-field-select.types';

export default function NativeFieldSelect<T extends string | number>({
  label = 'Player',
  selectedValue,
  onValueChange,
  options,
  enabled = true,
}: NativeFieldSelectProps<T>) {
  return (
    <Picker
      label={<Text>{label}</Text>}
      selection={selectedValue}
      onSelectionChange={(value) => onValueChange(value as T)}
      modifiers={[pickerStyle('menu'), disabled(!enabled)]}
    >
      {options.map((option) => (
        <Text key={option.value} modifiers={[tag(option.value)]}>
          {option.label}
        </Text>
      ))}
    </Picker>
  );
}
