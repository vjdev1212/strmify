import { Picker, Row, Spacer, Text } from '@expo/ui';
import type { NativeFieldSelectProps } from '@/components/native-field-select.types';

export default function NativeFieldSelect<T extends string | number>({
  label,
  selectedValue,
  onValueChange,
  options,
  enabled = true,
}: NativeFieldSelectProps<T>) {
  return (
    <Row alignment="center" spacing={12}>
      {label ? <Text>{label}</Text> : null}
      {label ? <Spacer flexible /> : null}
      <Picker selectedValue={selectedValue} onValueChange={onValueChange} appearance="menu" enabled={enabled}>
        {options.map((option) => (
          <Picker.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </Picker>
    </Row>
  );
}
