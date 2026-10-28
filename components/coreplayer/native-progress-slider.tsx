import { useEffect, useRef } from 'react';
import { Host } from '@expo/ui';
import { Slider } from '@expo/ui';
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
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  currentValue.current = value;

  useEffect(() => () => {
    if (finishTimer.current) clearTimeout(finishTimer.current);
  }, []);

  return (
    <Host style={styles.progressSlider} colorScheme="dark" seedColor="#007aff">
      <Slider
        min={0}
        max={1}
        value={value}
        disabled={!isReady}
        onValueChange={(nextValue) => {
          currentValue.current = nextValue;
          if (!isEditing.current) {
            isEditing.current = true;
            onSlidingStart();
          }
          onValueChange(nextValue);
          if (finishTimer.current) clearTimeout(finishTimer.current);
          finishTimer.current = setTimeout(() => {
            isEditing.current = false;
            onSlidingComplete(currentValue.current);
            finishTimer.current = null;
          }, 180);
        }}
      />
    </Host>
  );
}
