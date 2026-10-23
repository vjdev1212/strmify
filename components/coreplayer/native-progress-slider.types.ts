export interface NativeProgressSliderProps {
  value: number;
  isReady: boolean;
  onValueChange: (value: number) => void;
  onSlidingStart: () => void;
  onSlidingComplete: (value: number) => void;
}
