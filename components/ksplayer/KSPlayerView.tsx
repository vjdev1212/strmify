import React, { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  requireNativeComponent,
  UIManager,
  findNodeHandle,
  NativeSyntheticEvent,
  ViewStyle,
  StyleSheet,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KSAudioTrack {
  index: number;
  title: string;
  language: string;
  selected: boolean;
}

export interface KSTextTrack {
  index: number;
  title: string;
  language: string;
  selected: boolean;
}

export interface KSOnLoadData {
  duration: number;
  currentTime: number;
  naturalSize: { width: number; height: number; orientation: string };
  audioTracks: KSAudioTrack[];
  textTracks: KSTextTrack[];
}

export interface KSOnProgressData {
  currentTime: number;
  duration: number;
  playableDuration: number;
  seekableDuration: number;
}

export interface KSOnBufferData { isBuffering: boolean }
export interface KSOnErrorData { error: { message: string; code: number } }
/** NEW – emitted by the native side each time the subtitle line changes. */
export interface KSOnSubtitleTextData { text: string }

export interface KSPlayerViewProps {
  url: string;
  headers?: Record<string, string>;
  paused?: boolean;
  muted?: boolean;
  rate?: number;
  resizeMode?: 'contain' | 'cover' | 'stretch';
  style?: ViewStyle;

  onLoad?: (data: KSOnLoadData) => void;
  onProgress?: (data: KSOnProgressData) => void;
  onBuffer?: (data: KSOnBufferData) => void;
  onError?: (data: KSOnErrorData) => void;
  onEnd?: () => void;
  onReadyForDisplay?: () => void;
  onAudioTracks?: (data: { audioTracks: KSAudioTrack[] }) => void;
  onTextTracks?: (data: { textTracks: KSTextTrack[] }) => void;
  /** NEW – called whenever the current subtitle text changes. */
  onSubtitleText?: (data: KSOnSubtitleTextData) => void;
}

export interface KSPlayerRef {
  seek: (time: number) => void;
  play: () => void;
  pause: () => void;
  selectAudioTrack: (index: number) => void;
  selectTextTrack: (index: number) => void;
  disableTextTrack: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
}

// ─── Native component ─────────────────────────────────────────────────────────

const KSPlayerNative = requireNativeComponent<any>('KSPlayerView');

function dispatchCommand(ref: React.RefObject<any>, command: string, args: any[] = []) {
  const node = findNodeHandle(ref.current);
  if (!node) return;
  const commands = UIManager.getViewManagerConfig('KSPlayerView')?.Commands;
  if (!commands || commands[command] === undefined) {
    console.warn(`[KSPlayerView] Command "${command}" not found`);
    return;
  }
  UIManager.dispatchViewManagerCommand(node, commands[command], args);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const KSPlayerView = forwardRef<KSPlayerRef, KSPlayerViewProps>((props, ref) => {
  const nativeRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    seek(time) { dispatchCommand(nativeRef, 'seekTo', [time]); },
    play() { dispatchCommand(nativeRef, 'play'); },
    pause() { dispatchCommand(nativeRef, 'pause'); },
    selectAudioTrack(idx) { dispatchCommand(nativeRef, 'selectAudioTrack', [idx]); },
    selectTextTrack(idx) { dispatchCommand(nativeRef, 'selectTextTrack', [idx]); },
    disableTextTrack() { dispatchCommand(nativeRef, 'disableTextTrack'); },
    enterFullscreen() { dispatchCommand(nativeRef, 'enterFullscreen'); },
    exitFullscreen() { dispatchCommand(nativeRef, 'exitFullscreen'); },
  }));

  // ─── Event adapters ───────────────────────────────────────────────────────

  const handleLoad = useCallback(
    (e: NativeSyntheticEvent<KSOnLoadData>) => props.onLoad?.(e.nativeEvent),
    [props.onLoad]
  );
  const handleProgress = useCallback(
    (e: NativeSyntheticEvent<KSOnProgressData>) => props.onProgress?.(e.nativeEvent),
    [props.onProgress]
  );
  const handleBuffer = useCallback(
    (e: NativeSyntheticEvent<KSOnBufferData>) => props.onBuffer?.(e.nativeEvent),
    [props.onBuffer]
  );
  const handleError = useCallback(
    (e: NativeSyntheticEvent<KSOnErrorData>) => props.onError?.(e.nativeEvent),
    [props.onError]
  );
  const handleEnd = useCallback(() => props.onEnd?.(), [props.onEnd]);
  const handleReadyForDisplay = useCallback(() => props.onReadyForDisplay?.(), [props.onReadyForDisplay]);
  const handleAudioTracks = useCallback(
    (e: NativeSyntheticEvent<{ audioTracks: KSAudioTrack[] }>) => props.onAudioTracks?.(e.nativeEvent),
    [props.onAudioTracks]
  );
  const handleTextTracks = useCallback(
    (e: NativeSyntheticEvent<{ textTracks: KSTextTrack[] }>) => props.onTextTracks?.(e.nativeEvent),
    [props.onTextTracks]
  );
  /** NEW – forward subtitle text from native to the parent. */
  const handleSubtitleText = useCallback(
    (e: NativeSyntheticEvent<KSOnSubtitleTextData>) => props.onSubtitleText?.(e.nativeEvent),
    [props.onSubtitleText]
  );

  return (
    <View style={[styles.container, props.style]}>
      <KSPlayerNative
        ref={nativeRef}
        style={StyleSheet.absoluteFill}
        url={props.url}
        headers={props.headers ?? {}}
        paused={props.paused ?? false}
        muted={props.muted ?? false}
        rate={props.rate ?? 1.0}
        resizeMode={props.resizeMode ?? 'cover'}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onBuffer={handleBuffer}
        onError={handleError}
        onEnd={handleEnd}
        onReadyForDisplay={handleReadyForDisplay}
        onAudioTracks={handleAudioTracks}
        onTextTracks={handleTextTracks}
        onSubtitleText={handleSubtitleText}
      />
    </View>
  );
});

KSPlayerView.displayName = 'KSPlayerView';

const styles = StyleSheet.create({
  container: { backgroundColor: '#000', overflow: 'hidden' },
});

export default KSPlayerView;