import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  PanResponder,
  Platform,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Video, AVPlaybackStatus, VideoFullscreenUpdate } from 'expo-av';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// TypeScript Interfaces
export interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

export interface Chapter {
  title: string;
  startTime: number;
  endTime: number;
}

interface AudioTrack {
  id: string;
  title: string;
  language?: string;
}

interface SubtitleTrack {
  id: string;
  title: string;
  language?: string;
}

interface MediaPlayerProps {
  videoUrl: string;
  subtitles?: Subtitle[];
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  autoPlay?: boolean;
  chapters?: Chapter[];
  audioTracks?: AudioTrack[];
  subtitleTracks?: SubtitleTrack[];
}

type GestureType = 'volume' | 'brightness' | 'seek' | null;

export const MediaPlayer: React.FC<MediaPlayerProps> = ({ 
  videoUrl, 
  subtitles = [], 
  title = "Untitled Video",
  subtitle = "",
  onBack = () => {},
  autoPlay = true,
  chapters = [],
  audioTracks = [],
  subtitleTracks = []
}) => {
  // State
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1.0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(1.0);
  const [seekPreviewTime, setSeekPreviewTime] = useState<number | null>(null);
  const [gestureActive, setGestureActive] = useState<boolean>(false);
  const [gestureType, setGestureType] = useState<GestureType>(null);

  // Refs
  const videoRef = useRef<Video>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const advancedControlsOpacity = useRef(new Animated.Value(0)).current;
  const hideControlsTimeout = useRef<any>(null);
  const bufferingScale = useRef(new Animated.Value(1)).current;
  const gestureIndicatorOpacity = useRef(new Animated.Value(0)).current;

  // Gesture handling
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (): boolean => true,
      onMoveShouldSetPanResponder: (evt: GestureResponderEvent, gestureState: PanResponderGestureState): boolean => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: (evt: GestureResponderEvent, gestureState: PanResponderGestureState): void => {
        setGestureActive(true);
        const { locationX } = evt.nativeEvent;
        const screenThird = screenWidth / 3;
        
        if (locationX < screenThird) {
          setGestureType('brightness');
        } else if (locationX > screenThird * 2) {
          setGestureType('volume');
        } else {
          setGestureType('seek');
        }
        
        showGestureIndicator();
      },
      onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState): void => {
        const { dy, dx } = gestureState;
        
        if (gestureType === 'brightness') {
          const newBrightness = Math.max(0.1, Math.min(1, brightness - dy / 300));
          setBrightness(newBrightness);
        } else if (gestureType === 'volume') {
          const newVolume = Math.max(0, Math.min(1, volume - dy / 300));
          setVolume(newVolume);
          videoRef.current?.setVolumeAsync(newVolume);
        } else if (gestureType === 'seek') {
          const seekAmount = (dx / screenWidth) * duration;
          const newTime = Math.max(0, Math.min(duration, currentTime + seekAmount));
          setSeekPreviewTime(newTime);
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState): void => {
        if (gestureType === 'seek' && seekPreviewTime !== null) {
          videoRef.current?.setPositionAsync(seekPreviewTime);
          setSeekPreviewTime(null);
        }
        
        setGestureActive(false);
        setGestureType(null);
        hideGestureIndicator();
        
        // Single tap to toggle controls
        if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
          toggleControls();
        }
      },
    })
  ).current;

  // Auto-hide controls
  useEffect(() => {
    if (showControls && !gestureActive) {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
      hideControlsTimeout.current = setTimeout(() => {
        if (isPlaying) {
          hideControls();
        }
      }, 4000);
    }
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [showControls, isPlaying, gestureActive]);

  // Subtitle timing
  useEffect(() => {
    if (subtitles.length > 0 && showSubtitles) {
      const currentSub = subtitles.find(
        (sub: Subtitle) => currentTime >= sub.startTime && currentTime <= sub.endTime
      );
      setCurrentSubtitle(currentSub ? currentSub.text : '');
    } else {
      setCurrentSubtitle('');
    }
  }, [currentTime, subtitles, showSubtitles]);

  // Buffering animation
  useEffect(() => {
    if (isBuffering) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(bufferingScale, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bufferingScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      bufferingScale.stopAnimation();
      bufferingScale.setValue(1);
    }
  }, [isBuffering, bufferingScale]);

  const showControlsHandler = useCallback((): void => {
    setShowControls(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [controlsOpacity]);

  const hideControls = useCallback((): void => {
    setShowControls(false);
    setShowAdvancedControls(false);
    Animated.parallel([
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(advancedControlsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [controlsOpacity, advancedControlsOpacity]);

  const toggleControls = useCallback((): void => {
    if (showControls) {
      hideControls();
    } else {
      showControlsHandler();
    }
  }, [showControls, hideControls, showControlsHandler]);

  const showGestureIndicator = useCallback((): void => {
    Animated.timing(gestureIndicatorOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [gestureIndicatorOpacity]);

  const hideGestureIndicator = useCallback((): void => {
    Animated.timing(gestureIndicatorOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [gestureIndicatorOpacity]);

  const toggleAdvancedControls = useCallback((): void => {
    const newState = !showAdvancedControls;
    setShowAdvancedControls(newState);
    
    Animated.timing(advancedControlsOpacity, {
      toValue: newState ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showAdvancedControls, advancedControlsOpacity]);

  const togglePlay = useCallback(async (): Promise<void> => {
    try {
      if (isPlaying) {
        await videoRef.current?.pauseAsync();
      } else {
        await videoRef.current?.playAsync();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling play:', error);
    }
  }, [isPlaying]);

  const formatTime = useCallback((milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const skip = useCallback(async (seconds: number): Promise<void> => {
    const newTime = Math.max(0, Math.min(currentTime + (seconds * 1000), duration));
    await videoRef.current?.setPositionAsync(newTime);
  }, [currentTime, duration]);

  const getCurrentChapter = useCallback((): Chapter | undefined => {
    return chapters.find((chapter: Chapter) => 
      currentTime >= chapter.startTime && currentTime < chapter.endTime
    );
  }, [chapters, currentTime]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus): void => {
    if (status.isLoaded) {
      setCurrentTime(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsBuffering(status.isBuffering || false);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  }, []);

  const changePlaybackRate = useCallback(async (rate: number): Promise<void> => {
    try {
      await videoRef.current?.setRateAsync(rate, true);
      setPlaybackRate(rate);
    } catch (error) {
      console.error('Error changing playback rate:', error);
    }
  }, []);

  const playbackSpeeds: number[] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const currentChapter = getCurrentChapter();
  const displayTime = seekPreviewTime !== null ? seekPreviewTime : currentTime;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Video Player with Brightness Overlay */}
      <View style={styles.videoContainer} {...panResponder.panHandlers}>
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          shouldPlay={isPlaying}
          isLooping={false}
          volume={volume}
          rate={playbackRate}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={(error: string) => console.error('Video error:', error)}
        />
        
        {/* Brightness Overlay */}
        <View 
          style={[
            styles.brightnessOverlay, 
            { opacity: 1 - brightness }
          ]} 
          pointerEvents="none"
        />

        {/* Subtitle Overlay */}
        {currentSubtitle ? (
          <View style={styles.subtitleContainer}>
            <BlurView intensity={20} style={styles.subtitleBlur}>
              <Text style={styles.subtitleText}>{currentSubtitle}</Text>
            </BlurView>
          </View>
        ) : null}

        {/* Buffering Indicator */}
        {isBuffering && (
          <View style={styles.bufferingContainer}>
            <Animated.View 
              style={[
                styles.bufferingSpinner,
                { transform: [{ scale: bufferingScale }] }
              ]}
            >
              <View style={styles.bufferingRing}>
                <View style={styles.bufferingDot} />
              </View>
            </Animated.View>
          </View>
        )}

        {/* Gesture Indicators */}
        <Animated.View 
          style={[
            styles.gestureIndicator,
            { opacity: gestureIndicatorOpacity }
          ]}
          pointerEvents="none"
        >
          {gestureType === 'volume' && (
            <BlurView intensity={80} style={styles.gestureBlur}>
              <Ionicons name="volume-high" size={32} color="white" />
              <Text style={styles.gestureText}>{Math.round(volume * 100)}%</Text>
            </BlurView>
          )}
          {gestureType === 'brightness' && (
            <BlurView intensity={80} style={styles.gestureBlur}>
              <Ionicons name="sunny" size={32} color="white" />
              <Text style={styles.gestureText}>{Math.round(brightness * 100)}%</Text>
            </BlurView>
          )}
          {gestureType === 'seek' && seekPreviewTime !== null && (
            <BlurView intensity={80} style={styles.gestureBlur}>
              <Text style={styles.gestureTimeText}>{formatTime(seekPreviewTime)}</Text>
            </BlurView>
          )}
        </Animated.View>
      </View>

      {/* Controls Overlay */}
      <Animated.View 
        style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
        pointerEvents={showControls ? 'auto' : 'none'}
      >
        {/* Top Bar */}
        <BlurView intensity={60} style={styles.topBarBlur}>
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent']}
            style={styles.topGradient}
          >
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Ionicons name="chevron-back" size={28} color="white" />
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
                {currentChapter && (
                  <Text style={styles.chapterText} numberOfLines={1}>
                    {currentChapter.title}
                  </Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={toggleAdvancedControls}
              >
                <Feather name="more-horizontal" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BlurView>

        {/* Center Play Button */}
        {!isPlaying && (
          <TouchableOpacity style={styles.centerPlayButton} onPress={togglePlay}>
            <BlurView intensity={40} style={styles.centerPlayBlur}>
              <Ionicons name="play" size={48} color="white" style={{ marginLeft: 6 }} />
            </BlurView>
          </TouchableOpacity>
        )}

        {/* Bottom Controls */}
        <BlurView intensity={60} style={styles.bottomBarBlur}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)']}
            style={styles.bottomGradient}
          >
            <View style={styles.bottomControls}>
              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${duration > 0 ? (displayTime / duration) * 100 : 0}%` }
                    ]} 
                  />
                  <View 
                    style={[
                      styles.progressThumb,
                      { left: `${duration > 0 ? (displayTime / duration) * 100 : 0}%` }
                    ]}
                  />
                </View>
              </View>

              {/* Control Row */}
              <View style={styles.controlRow}>
                <Text style={styles.timeText}>{formatTime(displayTime)}</Text>
                
                <View style={styles.centerControls}>
                  <TouchableOpacity 
                    style={styles.skipButton} 
                    onPress={() => skip(-30)}
                  >
                    <MaterialIcons name="replay-30" size={32} color="white" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.playPauseButton} onPress={togglePlay}>
                    <Ionicons 
                      name={isPlaying ? "pause" : "play"} 
                      size={28} 
                      color="white"
                      style={!isPlaying ? { marginLeft: 3 } : undefined}
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.skipButton} 
                    onPress={() => skip(30)}
                  >
                    <MaterialIcons name="forward-30" size={32} color="white" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>

      {/* Advanced Controls Overlay */}
      <Animated.View 
        style={[styles.advancedControlsOverlay, { opacity: advancedControlsOpacity }]}
        pointerEvents={showAdvancedControls ? 'auto' : 'none'}
      >
        <TouchableOpacity 
          style={styles.advancedControlsBackground}
          onPress={toggleAdvancedControls}
        />
        <BlurView intensity={80} style={styles.advancedControlsPanel}>
          <View style={styles.advancedControlsContent}>
            <Text style={styles.advancedTitle}>Player Settings</Text>
            
            <View style={styles.controlGroup}>
              <Text style={styles.controlGroupTitle}>Playback Speed</Text>
              <View style={styles.speedOptions}>
                {playbackSpeeds.map((speed: number) => (
                  <TouchableOpacity
                    key={speed}
                    style={[
                      styles.speedOption,
                      playbackRate === speed && styles.selectedOption
                    ]}
                    onPress={() => changePlaybackRate(speed)}
                  >
                    <Text 
                      style={[
                        styles.optionText,
                        playbackRate === speed && styles.selectedOptionText
                      ]}
                    >
                      {speed}×
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.controlGroup}>
              <Text style={styles.controlGroupTitle}>Display</Text>
              <TouchableOpacity
                style={styles.toggleOption}
                onPress={() => setShowSubtitles(!showSubtitles)}
              >
                <Text style={styles.optionText}>Subtitles</Text>
                <View style={[
                  styles.toggle,
                  showSubtitles && styles.toggleActive
                ]}>
                  <Animated.View style={[
                    styles.toggleThumb,
                    { transform: [{ translateX: showSubtitles ? 20 : 0 }] }
                  ]} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: screenWidth,
    height: screenHeight,
  },
  brightnessOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topBarBlur: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  topGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  chapterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#00d4ff',
    marginTop: 4,
  },
  menuButton: {
    padding: 8,
  },
  centerPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -60 }, { translateY: -60 }],
  },
  centerPlayBlur: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  bottomBarBlur: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  bottomGradient: {
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
  },
  bottomControls: {
    paddingHorizontal: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    top: -6,
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    width: 65,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipButton: {
    padding: 12,
    marginHorizontal: 8,
  },
  playPauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  subtitleContainer: {
    position: 'absolute',
    bottom: 150,
    left: 30,
    right: 30,
    alignItems: 'center',
  },
  subtitleBlur: {
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  subtitleText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  bufferingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bufferingSpinner: {
    width: 60,
    height: 60,
  },
  bufferingRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bufferingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  gestureIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureBlur: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    minWidth: 120,
  },
  gestureText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  gestureTimeText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  advancedControlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advancedControlsBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  advancedControlsPanel: {
    borderRadius: 20,
    marginHorizontal: 40,
    maxWidth: 320,
    width: '100%',
    overflow: 'hidden',
  },
  advancedControlsContent: {
    padding: 24,
  },
  advancedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 24,
    textAlign: 'center',
  },
  controlGroup: {
    marginBottom: 24,
  },
  controlGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  speedOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speedOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedOption: {
    backgroundColor: 'white',
  },
  optionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedOptionText: {
    color: 'black',
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#00d4ff',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
});
