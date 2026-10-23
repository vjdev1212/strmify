import { useRef } from 'react';
import type { CSSProperties, PointerEvent, KeyboardEvent } from 'react';
import type { NativeProgressSliderProps } from './native-progress-slider.types';

const sliderStyle: CSSProperties = {
  accentColor: '#007aff',
  background: 'transparent',
  flex: '1 1 0%',
  height: 32,
  margin: 0,
  minWidth: 0,
  width: '100%',
};

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

  const startEditing = () => {
    if (isEditing.current) return;
    isEditing.current = true;
    onSlidingStart();
  };

  const finishEditing = () => {
    if (!isEditing.current) return;
    isEditing.current = false;
    onSlidingComplete(currentValue.current);
  };

  const handlePointerUp = (_event: PointerEvent<HTMLInputElement>) => finishEditing();
  const handleKeyUp = (_event: KeyboardEvent<HTMLInputElement>) => finishEditing();

  return (
    <input
      aria-label="Playback position"
      disabled={!isReady}
      max={1}
      min={0}
      onBlur={finishEditing}
      onChange={(event) => {
        const nextValue = Number(event.currentTarget.value);
        currentValue.current = nextValue;
        onValueChange(nextValue);
      }}
      onKeyDown={startEditing}
      onKeyUp={handleKeyUp}
      onPointerDown={startEditing}
      onPointerUp={handlePointerUp}
      onPointerCancel={finishEditing}
      step={0.001}
      style={sliderStyle}
      type="range"
      value={value}
    />
  );
}
