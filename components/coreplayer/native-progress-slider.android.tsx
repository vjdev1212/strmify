import { useRef } from 'react';
import { Host } from '@expo/ui';
import { Slider } from '@expo/ui/jetpack-compose';
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
  const isDragging = useRef(false);
  currentValue.current = value;

  return (
    <Host style={styles.progressSlider} colorScheme="dark" seedColor="#007aff">
      <Slider
        min={0}
        max={1}
        value={value}
        enabled={isReady}
        colors={{
          activeTrackColor: '#007aff',
          inactiveTrackColor: 'rgba(255, 255, 255, 0.3)',
          thumbColor: '#ffffff',
        }}
        onValueChange={(nextValue) => {
          currentValue.current = nextValue;
          if (!isDragging.current) {
            isDragging.current = true;
            onSlidingStart();
          }
          onValueChange(nextValue);
        }}
        onValueChangeFinished={() => {
          if (!isDragging.current) return;
          isDragging.current = false;
          onSlidingComplete(currentValue.current);
        }}
      />
    </Host>
  );
}
