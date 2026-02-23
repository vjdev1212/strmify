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

// ─── Types (mirrors react-native-video shapes your MediaPlayer already uses) ──

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
  naturalSize: {
    width: number;
    height: number;
    orientation: string;
  };
  audioTracks: KSAudioTrack[];
  textTracks: KSTextTrack[];
}

export interface KSOnProgressData {
  currentTime: number;
  duration: number;
  playableDuration: number;
  seekableDuration: number;
}

export interface KSOnBufferData {
  isBuffering: boolean;
}

export interface KSOnErrorData {
  error: {
    message: string;
    code: number;
  };
}

export interface KSPlayerViewProps {
  // Source
  url: string;
  headers?: Record<string, string>;

  // Playback control
  paused?: boolean;
  muted?: boolean;
  rate?: number;
  resizeMode?: 'contain' | 'cover' | 'stretch';

  // Layout
  style?: ViewStyle;

  // Callbacks — same names as react-native-video so your MediaPlayer needs
  // minimal changes
  onLoad?: (data: KSOnLoadData) => void;
  onProgress?: (data: KSOnProgressData) => void;
  onBuffer?: (data: KSOnBufferData) => void;
  onError?: (data: KSOnErrorData) => void;
  onEnd?: () => void;
  onReadyForDisplay?: () => void;
  onAudioTracks?: (data: { audioTracks: KSAudioTrack[] }) => void;
  onTextTracks?: (data: { textTracks: KSTextTrack[] }) => void;
}

export interface KSPlayerRef {
  // Imperative API — mirrors VideoRef methods your MediaPlayer calls
  seek: (time: number) => void;
  play: () => void;
  pause: () => void;
  selectAudioTrack: (trackId: number) => void;
  selectTextTrack: (trackId: number) => void;
  disableTextTrack: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
}

// ─── Native component registration ───────────────────────────────────────────

const KSPlayerNative = requireNativeComponent<any>('KSPlayerView');

// ─── Helper to dispatch UIManager commands ────────────────────────────────────

function dispatchCommand(ref: React.RefObject<any>, command: string, args: any[] = []) {
  const node = findNodeHandle(ref.current);
  if (!node) return;

  const commands = UIManager.getViewManagerConfig('KSPlayerView')?.Commands;
  if (!commands || commands[command] === undefined) {
    console.warn(`[KSPlayerView] Command "${command}" not found in native module`);
    return;
  }

  UIManager.dispatchViewManagerCommand(node, commands[command], args);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const KSPlayerView = forwardRef<KSPlayerRef, KSPlayerViewProps>(
  (props, ref) => {
    const nativeRef = useRef<any>(null);

    // Expose imperative API that mirrors VideoRef used in your MediaPlayer
    useImperativeHandle(ref, () => ({
      seek(time: number) {
        dispatchCommand(nativeRef, 'seekTo', [time]);
      },
      play() {
        dispatchCommand(nativeRef, 'play');
      },
      pause() {
        dispatchCommand(nativeRef, 'pause');
      },
      selectAudioTrack(trackId: number) {
        dispatchCommand(nativeRef, 'selectAudioTrack', [trackId]);
      },
      selectTextTrack(trackId: number) {
        dispatchCommand(nativeRef, 'selectTextTrack', [trackId]);
      },
      disableTextTrack() {
        dispatchCommand(nativeRef, 'disableTextTrack');
      },
      enterFullscreen() {
        dispatchCommand(nativeRef, 'enterFullscreen');
      },
      exitFullscreen() {
        dispatchCommand(nativeRef, 'exitFullscreen');
      },
    }));

    // ─── Event adapters (unwrap nativeEvent) ───────────────────────────────

    const handleLoad = useCallback(
      (e: NativeSyntheticEvent<KSOnLoadData>) => {
        props.onLoad?.(e.nativeEvent);
      },
      [props.onLoad]
    );

    const handleProgress = useCallback(
      (e: NativeSyntheticEvent<KSOnProgressData>) => {
        props.onProgress?.(e.nativeEvent);
      },
      [props.onProgress]
    );

    const handleBuffer = useCallback(
      (e: NativeSyntheticEvent<KSOnBufferData>) => {
        props.onBuffer?.(e.nativeEvent);
      },
      [props.onBuffer]
    );

    const handleError = useCallback(
      (e: NativeSyntheticEvent<KSOnErrorData>) => {
        props.onError?.(e.nativeEvent);
      },
      [props.onError]
    );

    const handleEnd = useCallback(() => {
      props.onEnd?.();
    }, [props.onEnd]);

    const handleReadyForDisplay = useCallback(() => {
      props.onReadyForDisplay?.();
    }, [props.onReadyForDisplay]);

    const handleAudioTracks = useCallback(
      (e: NativeSyntheticEvent<{ audioTracks: KSAudioTrack[] }>) => {
        props.onAudioTracks?.(e.nativeEvent);
      },
      [props.onAudioTracks]
    );

    const handleTextTracks = useCallback(
      (e: NativeSyntheticEvent<{ textTracks: KSTextTrack[] }>) => {
        props.onTextTracks?.(e.nativeEvent);
      },
      [props.onTextTracks]
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
        />
      </View>
    );
  }
);

KSPlayerView.displayName = 'KSPlayerView';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
});

export default KSPlayerView;
