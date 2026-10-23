import { useRef } from 'react';
import { Host } from '@expo/ui';
import { Slider } from '@expo/ui/swift-ui';
import { disabled, tint } from '@expo/ui/swift-ui/modifiers';
import { styles } from './styles';
import type { NativeProgressSliderProps } from './native-progress-slider.types';

export default function NativeProgressSlider({
  value,
  isReady,
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
}: NativeProgressSliderProps) {
  const currentValue = useRef(value);
  const isEditing = useRef(false);
  currentValue.current = value;

  return (
    <Host style={styles.progressSlider} colorScheme="dark" seedColor="#007aff">
      <Slider
        min={0}
        max={1}
        value={value}
        onValueChange={(nextValue) => {
          currentValue.current = nextValue;
          onValueChange(nextValue);
        }}
        onEditingChanged={(editing) => {
          if (editing && !isEditing.current) {
            isEditing.current = true;
            onSlidingStart();
          } else if (!editing && isEditing.current) {
            isEditing.current = false;
            onSlidingComplete(currentValue.current);
          }
        }}
        modifiers={[tint('#007aff'), disabled(!isReady)]}
      />
    </Host>
  );
}
