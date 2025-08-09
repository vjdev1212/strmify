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
    LayoutChangeEvent,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

// Get initial dimensions
let { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// TypeScript Interfaces
interface Subtitle {
    startTime: number;
    endTime: number;
    text: string;
}

interface Chapter {
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

const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    subtitles = [],
    title = "Untitled Video",
    subtitle = "",
    onBack = () => { },
    autoPlay = true,
    chapters = [],
    audioTracks = [],
    subtitleTracks = []
}) => {
    // State
    const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
    const [showControls, setShowControls] = useState<boolean>(false);
    const [hasStartedPlaying, setHasStartedPlaying] = useState<boolean>(false);
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
    const [resizeMode, setResizeMode] = useState<ResizeMode>(ResizeMode.STRETCH);
    const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState<string | null>(null);
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
    const [isSeeking, setIsSeeking] = useState<boolean>(false);
    const [safeAreaInsets, setSafeAreaInsets] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

    // New: progress bar measured width
    const [progressBarWidth, setProgressBarWidth] = useState<number>(0);

    // Refs
    const videoRef = useRef<Video>(null);
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const advancedControlsOpacity = useRef(new Animated.Value(0)).current;
    const hideControlsTimeout = useRef<any>(null);
    const bufferingScale = useRef(new Animated.Value(1)).current;
    const gestureIndicatorOpacity = useRef(new Animated.Value(0)).current;

    // Set landscape orientation on mount
    useEffect(() => {
        const setLandscape = async () => {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        };
        setLandscape();

        return () => {
            ScreenOrientation.unlockAsync();
        };
    }, []);

    // Handle orientation changes and safe area
    useEffect(() => {
        const updateDimensions = (dimensions: { width: number; height: number }) => {
            screenWidth = dimensions.width;
            screenHeight = dimensions.height;
            const isLandscape = dimensions.width > dimensions.height;
            setOrientation(isLandscape ? 'landscape' : 'portrait');

            // Calculate safe area insets for iPhone notch
            if (Platform.OS === 'ios' && isLandscape) {
                setSafeAreaInsets({
                    top: 0,
                    bottom: 0,
                    left: 44,
                    right: 44,
                });
            } else if (Platform.OS === 'ios') {
                setSafeAreaInsets({
                    top: 44,
                    bottom: 34,
                    left: 0,
                    right: 0,
                });
            } else {
                setSafeAreaInsets({ top: 24, bottom: 0, left: 0, right: 0 });
            }
        };

        // Initial setup
        updateDimensions(Dimensions.get('window'));

        // Listen for changes
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            updateDimensions(window);
        });

        return () => subscription?.remove();
    }, []);

    // Progress bar pan responder for seeking
    const progressPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (): boolean => true,
            onMoveShouldSetPanResponder: (): boolean => true,
            onPanResponderGrant: (evt: GestureResponderEvent): void => {
                if (duration <= 0 || progressBarWidth <= 0) return;

                setIsSeeking(true);
                const { locationX } = evt.nativeEvent;
                const progress = Math.max(0, Math.min(1, locationX / progressBarWidth));
                const newTime = progress * duration;
                setSeekPreviewTime(newTime);
            },
            onPanResponderMove: (evt: GestureResponderEvent): void => {
                if (duration <= 0 || progressBarWidth <= 0) return;

                const { locationX } = evt.nativeEvent;
                const progress = Math.max(0, Math.min(1, locationX / progressBarWidth));
                const newTime = progress * duration;
                setSeekPreviewTime(newTime);
            },
            onPanResponderRelease: (): void => {
                if (seekPreviewTime !== null && duration > 0) {
                    videoRef.current?.setPositionAsync(seekPreviewTime);
                    setSeekPreviewTime(null);
                }
                setIsSeeking(false);
            },
        })
    ).current;

    // Main video gesture handler - disabled when seeking & when touches in control areas
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (): boolean => !isSeeking,
            onMoveShouldSetPanResponder: (evt: GestureResponderEvent, gestureState: PanResponderGestureState): boolean => {
                if (isSeeking) return false;

                const { locationY } = evt.nativeEvent;
                const topControlsHeight = safeAreaInsets.top + 100;
                const bottomControlsHeight = 180 + safeAreaInsets.bottom;

                // Don't handle gestures in control areas when controls are visible
                if (showControls && (locationY < topControlsHeight || locationY > screenHeight - bottomControlsHeight)) {
                    return false;
                }

                // Require minimum movement for gesture
                return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
            },
            onPanResponderGrant: (evt: GestureResponderEvent, gestureState: PanResponderGestureState): void => {
                if (isSeeking) return;

                const { locationX, locationY } = evt.nativeEvent;
                const topControlsHeight = safeAreaInsets.top + 100;
                const bottomControlsHeight = 180 + safeAreaInsets.bottom;

                // Don't handle gestures in control areas when controls are visible
                if (showControls && (locationY < topControlsHeight || locationY > screenHeight - bottomControlsHeight)) {
                    return;
                }

                setGestureActive(true);

                // Left side for brightness, right side for volume, center for seek
                const leftThreshold = screenWidth * 0.3;
                const rightThreshold = screenWidth * 0.7;

                if (locationX < leftThreshold) {
                    setGestureType('brightness');
                } else if (locationX > rightThreshold) {
                    setGestureType('volume');
                } else {
                    setGestureType('seek');
                }

                showGestureIndicator();
            },
            onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState): void => {
                if (isSeeking) return;

                const { dy, dx } = gestureState;

                if (gestureType === 'brightness') {
                    const newBrightness = Math.max(0.1, Math.min(1, brightness - dy / 400));
                    setBrightness(newBrightness);
                } else if (gestureType === 'volume') {
                    const newVolume = Math.max(0, Math.min(1, volume - dy / 400));
                    setVolume(newVolume);
                    videoRef.current?.setVolumeAsync(newVolume);
                } else if (gestureType === 'seek') {
                    const seekAmount = (dx / screenWidth) * duration;
                    const newTime = Math.max(0, Math.min(duration, currentTime + seekAmount));
                    setSeekPreviewTime(newTime);
                }
            },
            onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState): void => {
                if (isSeeking) return;

                if (gestureType === 'seek' && seekPreviewTime !== null) {
                    videoRef.current?.setPositionAsync(seekPreviewTime);
                    setSeekPreviewTime(null);
                }

                setGestureActive(false);
                setGestureType(null);
                hideGestureIndicator();

                // Single tap to toggle controls (only if no significant movement)
                if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
                    const { locationY } = evt.nativeEvent;
                    const topControlsHeight = safeAreaInsets.top + 100;
                    const bottomControlsHeight = 180 + safeAreaInsets.bottom;

                    // Only toggle controls in safe zones or when controls are hidden
                    if (!showControls || (locationY >= topControlsHeight && locationY <= screenHeight - bottomControlsHeight)) {
                        toggleControls();
                    }
                }
            },
        })
    ).current;

    // Auto-hide controls after video starts playing
    useEffect(() => {
        if (showControls && !gestureActive && hasStartedPlaying && isPlaying) {
            if (hideControlsTimeout.current) {
                clearTimeout(hideControlsTimeout.current);
            }
            hideControlsTimeout.current = setTimeout(() => {
                hideControls();
            }, 3000); // Hide after 3 seconds when playing
        }
        return () => {
            if (hideControlsTimeout.current) {
                clearTimeout(hideControlsTimeout.current);
            }
        };
    }, [showControls, isPlaying, gestureActive, hasStartedPlaying]);

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
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [controlsOpacity]);

    const hideControls = useCallback((): void => {
        setShowControls(false);
        setShowAdvancedControls(false);
        Animated.parallel([
            Animated.timing(controlsOpacity, {
                toValue: 0,
                duration: 200,
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
            duration: 150,
            useNativeDriver: true,
        }).start();
    }, [gestureIndicatorOpacity]);

    const hideGestureIndicator = useCallback((): void => {
        Animated.timing(gestureIndicatorOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [gestureIndicatorOpacity]);

    const toggleAdvancedControls = useCallback((): void => {
        const newState = !showAdvancedControls;
        setShowAdvancedControls(newState);

        Animated.timing(advancedControlsOpacity, {
            toValue: newState ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [showAdvancedControls, advancedControlsOpacity]);

    const togglePlay = useCallback(async (): Promise<void> => {
        try {
            if (isPlaying) {
                await videoRef.current?.pauseAsync();
            } else {
                await videoRef.current?.playAsync();
                if (!hasStartedPlaying) {
                    setHasStartedPlaying(true);
                    showControlsHandler();
                }
            }
            setIsPlaying(!isPlaying);
        } catch (error) {
            console.error('Error toggling play:', error);
        }
    }, [isPlaying, hasStartedPlaying, showControlsHandler]);

    const formatTime = useCallback((milliseconds: number): string => {
        if (!milliseconds || isNaN(milliseconds) || milliseconds < 0) {
            return '0:00';
        }

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
            const currentPos = status.positionMillis || 0;
            const totalDuration = status.durationMillis || 0;

            if (!isNaN(currentPos) && currentPos >= 0) {
                setCurrentTime(currentPos);
            }
            if (!isNaN(totalDuration) && totalDuration > 0) {
                setDuration(totalDuration);
            }

            setIsBuffering(status.isBuffering || false);

            if (currentPos && currentPos > 0 && !hasStartedPlaying) {
                setHasStartedPlaying(true);
            }

            if ((status as any).didJustFinish) {
                setIsPlaying(false);
                showControlsHandler();
            }
        }
    }, [hasStartedPlaying, showControlsHandler]);

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
    const displayTime = (seekPreviewTime !== null && !isNaN(seekPreviewTime)) ? seekPreviewTime : currentTime;

    // onLayout handler for the progress bar container
    const onProgressBarLayout = (e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width;
        setProgressBarWidth(w);
    };

    // compute numeric widths for fill and thumb based on measured width
    const progressRatio = (duration > 0 && !isNaN(displayTime) && progressBarWidth > 0) ? Math.max(0, Math.min(1, displayTime / duration)) : 0;
    const fillWidth = progressBarWidth * progressRatio;
    const thumbLeft = fillWidth - 8; // thumb is 16 wide, center it (8)

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
                    resizeMode={resizeMode}
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                    onError={(error: any) => console.error('Video error:', error)}
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
                        <View style={styles.subtitleBackground}>
                            <Text style={styles.subtitleText}>{currentSubtitle}</Text>
                        </View>
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
                        <View style={styles.gestureBlur}>
                            <Ionicons name="volume-high" size={32} color="white" />
                            <Text style={styles.gestureText}>{Math.round(volume * 100)}%</Text>
                        </View>
                    )}
                    {gestureType === 'brightness' && (
                        <View style={styles.gestureBlur}>
                            <Ionicons name="sunny" size={32} color="white" />
                            <Text style={styles.gestureText}>{Math.round(brightness * 100)}%</Text>
                        </View>
                    )}
                    {gestureType === 'seek' && seekPreviewTime !== null && (
                        <View style={styles.gestureBlur}>
                            <Text style={styles.gestureTimeText}>{formatTime(seekPreviewTime)}</Text>
                        </View>
                    )}
                </Animated.View>
            </View>

            {/* Controls Overlay */}
            <Animated.View
                style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
                pointerEvents={showControls ? 'auto' : 'none'}
            >
                {/* Top Bar */}
                <View style={[styles.topBar, {
                    paddingLeft: safeAreaInsets.left,
                    paddingRight: safeAreaInsets.right,
                    paddingTop: safeAreaInsets.top,
                }]}>
                    <View style={styles.topBarBackground}>
                        <View style={styles.topBarContent}>
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
                    </View>
                </View>

                {/* Center Play Button - Always visible when not playing */}
                {!isPlaying && (
                    <View style={styles.centerContainer}>
                        <TouchableOpacity style={styles.centerPlayButton} onPress={togglePlay}>
                            <View style={styles.centerPlayBackground}>
                                <Ionicons name="play" size={48} color="white" style={{ marginLeft: 6 }} />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Bottom Controls */}
                <View style={[styles.bottomBar, {
                    paddingLeft: safeAreaInsets.left,
                    paddingRight: safeAreaInsets.right,
                    paddingBottom: safeAreaInsets.bottom,
                }]}>
                    <View style={styles.bottomBarBackground}>
                        <View style={styles.bottomControls}>
                            {/* Progress Bar - Now seekable */}
                            <View
                                style={styles.progressContainer}
                                onLayout={onProgressBarLayout}
                                pointerEvents="box-none"
                            >
                                {/* Touch area handles panResponder for progress (seeking) */}
                                <View
                                    style={[styles.progressBar, { width: '100%' }]}
                                    {...progressPanResponder.panHandlers}
                                >
                                    <View style={[styles.progressBackground]} />
                                    {/* Fill */}
                                    <View style={[styles.progressFill, { width: fillWidth }]} />
                                    {/* Thumb */}
                                    <View style={[styles.progressThumb, { left: Math.max(0, thumbLeft) }]} />
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
                    </View>
                </View>
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
                <View style={styles.advancedControlsPanel}>
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
                            <Text style={styles.controlGroupTitle}>Video</Text>
                            <View style={styles.aspectRatioOptions}>
                                {[
                                    { mode: ResizeMode.STRETCH, label: 'Stretch' },
                                    { mode: ResizeMode.CONTAIN, label: 'Fit' },
                                    { mode: ResizeMode.COVER, label: 'Fill' },
                                ].map((option) => (
                                    <TouchableOpacity
                                        key={option.label}
                                        style={[
                                            styles.aspectRatioOption,
                                            resizeMode === option.mode && styles.selectedOption
                                        ]}
                                        onPress={() => setResizeMode(option.mode)}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                resizeMode === option.mode && styles.selectedOptionText
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.controlGroup}>
                            <Text style={styles.controlGroupTitle}>Subtitles</Text>
                            <View style={styles.subtitleOptionsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.subtitleOption,
                                        selectedSubtitleTrack === null && styles.selectedOption
                                    ]}
                                    onPress={() => {
                                        setSelectedSubtitleTrack(null);
                                        setShowSubtitles(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            selectedSubtitleTrack === null && styles.selectedOptionText
                                        ]}
                                    >
                                        Off
                                    </Text>
                                </TouchableOpacity>
                                {subtitleTracks.map((track) => (
                                    <TouchableOpacity
                                        key={track.id}
                                        style={[
                                            styles.subtitleOption,
                                            selectedSubtitleTrack === track.id && styles.selectedOption
                                        ]}
                                        onPress={() => {
                                            setSelectedSubtitleTrack(track.id);
                                            setShowSubtitles(true);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                selectedSubtitleTrack === track.id && styles.selectedOptionText
                                            ]}
                                        >
                                            {track.title}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {subtitles.length > 0 && (
                                    <TouchableOpacity
                                        style={[
                                            styles.subtitleOption,
                                            selectedSubtitleTrack === 'built-in' && styles.selectedOption
                                        ]}
                                        onPress={() => {
                                            setSelectedSubtitleTrack('built-in');
                                            setShowSubtitles(true);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                selectedSubtitleTrack === 'built-in' && styles.selectedOptionText
                                            ]}
                                        >
                                            Built-in
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    video: {
        width: '100%',
        height: '100%',
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
    topBar: {},
    topBarBackground: {
        paddingVertical: 15,
    },
    topBarContent: {
        flexDirection: 'row',
        alignItems: 'center',
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
    centerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'box-none',
    },
    centerPlayButton: {},
    centerPlayBackground: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    bottomBar: {},
    bottomBarBackground: {
        paddingTop: 15,
        paddingBottom: 10,
    },
    bottomControls: {},
    progressContainer: {
        marginBottom: 12,
        paddingHorizontal: 20,
    },
    progressBar: {
        height: 24,
        justifyContent: 'center',
        position: 'relative',
    },
    progressBackground: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        height: 4,
        backgroundColor: '#00d4ff',
        borderRadius: 2,
    },
    progressThumb: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#00d4ff',
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
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    subtitleContainer: {
        position: 'absolute',
        bottom: 120,
        left: 30,
        right: 30,
        alignItems: 'center',
    },
    subtitleBackground: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 8,
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 20,
        marginHorizontal: 40,
        maxWidth: 320,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
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
        backgroundColor: '#00d4ff',
    },
    optionText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    selectedOptionText: {
        color: 'black',
    },
    aspectRatioOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    aspectRatioOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    subtitleOptionsContainer: {
        flexDirection: 'column',
        gap: 8,
    },
    subtitleOption: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
});

export type { Subtitle, Chapter };
export default MediaPlayer;
