import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    StatusBar,
    ActivityIndicator,
    Platform,
    Image,
} from "react-native";
import { PlayerResizeMode, VLCPlayer } from 'react-native-vlc-media-player';
import * as ScreenOrientation from "expo-screen-orientation";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from '@react-native-assets/slider';
import { MenuView } from '@react-native-menu/menu';
import ImmersiveMode from "react-native-immersive-mode";
import { showAlert } from "@/utils/platform";
import { MediaPlayerProps, DownloadResponse } from "./models";
import { formatTime, playHaptic } from "./utils";
import { parseSubtitleFile } from "./subtitle";
import { styles } from "./styles";

// ============================================================================
// TYPES
// ============================================================================
type TimerName =
    | 'hideControls'
    | 'resizeModeLabel'
    | 'buffering'
    | 'controlsDebounce'
    | 'progressDebounce'
    | 'seekDebounce'
    | 'bufferingTimeout'
    | 'doubleTap';

interface PlayerState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    isBuffering: boolean;
    isPaused: boolean;
    isReady: boolean;
    isDragging: boolean;
    dragPosition: number;
    error: string | null;
    showBufferingLoader: boolean;
    hasStartedPlaying: boolean;
    isSeeking: boolean;
}

interface SubtitleState {
    currentSubtitle: string;
    parsedSubtitles: any[];
    isLoadingSubtitles: boolean;
}

interface PlayerSettings {
    isMuted: boolean;
    playbackSpeed: number;
    resizeMode: PlayerResizeMode;
    brightness: number;
    selectedSubtitle: number;
    selectedAudioTrack: number;
    availableAudioTracks: any[];
}

interface SeekFeedbackState {
    show: boolean;
    direction: 'forward' | 'backward';
    seconds: number;
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const usePlayerState = () => {
    const [state, setState] = useState<PlayerState>({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isBuffering: true,
        isPaused: false,
        isReady: false,
        isDragging: false,
        dragPosition: 0,
        error: null,
        showBufferingLoader: false,
        hasStartedPlaying: false,
        isSeeking: false,
    });

    const updateState = useCallback((updates: Partial<PlayerState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    return { state, updateState };
};

const useSubtitleState = () => {
    const [state, setState] = useState<SubtitleState>({
        currentSubtitle: '',
        parsedSubtitles: [],
        isLoadingSubtitles: false,
    });

    const updateState = useCallback((updates: Partial<SubtitleState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    return { state, updateState };
};

const usePlayerSettings = () => {
    const [settings, setSettings] = useState<PlayerSettings>({
        isMuted: false,
        playbackSpeed: 1.0,
        resizeMode: 'fill',
        brightness: 1,
        selectedSubtitle: -1,
        selectedAudioTrack: 1,
        availableAudioTracks: [],
    });

    const updateSettings = useCallback((updates: Partial<PlayerSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    }, []);

    return { settings, updateSettings };
};

const useTimers = () => {
    const timersRef = useRef<Record<TimerName, ReturnType<typeof setTimeout> | null>>({
        hideControls: null,
        resizeModeLabel: null,
        buffering: null,
        controlsDebounce: null,
        progressDebounce: null,
        seekDebounce: null,
        bufferingTimeout: null,
        doubleTap: null,
    });

    const clearTimer = useCallback((timerName: TimerName) => {
        if (timersRef.current[timerName]) {
            clearTimeout(timersRef.current[timerName]!);
            timersRef.current[timerName] = null;
        }
    }, []);

    const setTimer = useCallback((timerName: TimerName, callback: () => void, delay: number) => {
        clearTimer(timerName);
        timersRef.current[timerName] = setTimeout(callback, delay);
    }, [clearTimer]);

    const clearAllTimers = useCallback(() => {
        (Object.keys(timersRef.current) as TimerName[]).forEach(clearTimer);
    }, [clearTimer]);

    return { clearTimer, setTimer, clearAllTimers };
};

// ============================================================================
// GESTURE HANDLING
// ============================================================================

const useGestureHandling = (
    onSeekForward: (seconds: number) => void,
    onSeekBackward: (seconds: number) => void,
    onToggleControls: () => void,
    timers: ReturnType<typeof useTimers>,
    isReady: boolean
) => {
    const lastTap = useRef<{ timestamp: number; side: 'left' | 'right' | null }>({
        timestamp: 0,
        side: null,
    });

    const handleTouchablePress = useCallback((event: any) => {
        if (!isReady) return;

        const { locationX } = event.nativeEvent;
        const screenWidth = event.nativeEvent.target?.offsetWidth || 400;
        const currentTime = Date.now();
        const tapSide = locationX < screenWidth / 2 ? 'left' : 'right';

        const isDoubleTap =
            currentTime - lastTap.current.timestamp < 300 &&
            lastTap.current.side === tapSide;

        if (isDoubleTap) {
            timers.clearTimer('doubleTap');
            tapSide === 'left' ? onSeekBackward(10) : onSeekForward(10);
            lastTap.current = { timestamp: 0, side: null };
        } else {
            lastTap.current = { timestamp: currentTime, side: tapSide };
            timers.clearTimer('doubleTap');
            timers.setTimer('doubleTap', () => {
                onToggleControls();
                lastTap.current = { timestamp: 0, side: null };
            }, 300);
        }
    }, [isReady, onSeekForward, onSeekBackward, onToggleControls, timers]);

    return { handleTouchablePress };
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

const SeekFeedback: React.FC<SeekFeedbackState> = React.memo(({ show, direction, seconds }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        if (show) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                        Animated.timing(scaleAnim, { toValue: 0.8, duration: 300, useNativeDriver: true })
                    ]).start();
                }, 800);
            });
        }
    }, [show, fadeAnim, scaleAnim]);

    if (!show) return null;

    return (
        <Animated.View
            style={[
                styles.seekFeedback,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                    left: direction === 'backward' ? '20%' : undefined,
                    right: direction === 'forward' ? '20%' : undefined,
                }
            ]}
            pointerEvents="none"
        >
            <View style={styles.seekFeedbackContent}>
                <Ionicons
                    name={direction === 'forward' ? 'play-forward' : 'play-back'}
                    size={32}
                    color="white"
                />
                <Text style={styles.seekFeedbackText}>{seconds}s</Text>
            </View>
        </Animated.View>
    );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const NativeMediaPlayerComponent: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    onBack,
    artwork,
    subtitles = [],
    openSubtitlesClient
}) => {
    // Refs
    const playerRef = useRef<VLCPlayer>(null);
    const stateRefs = useRef<PlayerState>({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isBuffering: true,
        isPaused: false,
        isReady: false,
        isDragging: false,
        dragPosition: 0,
        error: null,
        showBufferingLoader: false,
        hasStartedPlaying: false,
        isSeeking: false,
    });

    // State hooks
    const { state: playerState, updateState: updatePlayerState } = usePlayerState();
    const { state: subtitleState, updateState: updateSubtitleState } = useSubtitleState();
    const { settings, updateSettings } = usePlayerSettings();
    const timers = useTimers();

    // UI state
    const [showControls, setShowControls] = useState(false);
    const [videoScale, setVideoScale] = useState({ x: 1.0, y: 1.0 });
    const [seekFeedback, setSeekFeedback] = useState<SeekFeedbackState>({
        show: false,
        direction: 'forward',
        seconds: 10
    });

    // Animated values
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const progressBarValue = useRef(new Animated.Value(0)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;

    // Sync state to refs for callbacks
    useEffect(() => {
        stateRefs.current = playerState;
    }, [playerState]);

    // ========================================================================
    // LIFECYCLE & SETUP
    // ========================================================================

    useEffect(() => {
        const setupOrientation = async () => {
            try {
                if (Platform.OS !== 'web') {
                    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                    StatusBar.setHidden(true);
                }
            } catch (error) {
                console.warn("Failed to set orientation:", error);
            }
        };

        setupOrientation();

        return () => {
            if (Platform.OS !== 'web') {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                StatusBar.setHidden(false);
            }
            timers.clearAllTimers();
        };
    }, [timers]);

    useEffect(() => {
        if (Platform.OS === "android") {
            ImmersiveMode.fullLayout(true);
        }
        return () => {
            if (Platform.OS === "android") {
                ImmersiveMode.fullLayout(true);
            }
        };
    }, []);

    // ========================================================================
    // SUBTITLE LOADING
    // ========================================================================

    useEffect(() => {
        const loadSubtitle = async () => {
            if (settings.selectedSubtitle < 0 || settings.selectedSubtitle >= subtitles.length) {
                updateSubtitleState({ parsedSubtitles: [], currentSubtitle: '' });
                return;
            }

            const selectedSub = subtitles[settings.selectedSubtitle];
            updateSubtitleState({ isLoadingSubtitles: true });

            try {
                let subtitleContent: string;

                // Handle OpenSubtitles download
                if (selectedSub.fileId && openSubtitlesClient) {
                    console.log('Downloading subtitle from OpenSubtitles, fileId:', selectedSub.fileId);
                    const response = await openSubtitlesClient.downloadSubtitle(String(selectedSub.fileId));

                    if (('status' in response && response.status !== 200) ||
                        ('success' in response && response.success === false) ||
                        ('error' in response && response.error)) {
                        throw new Error(('message' in response && response.message) || 'Unknown error');
                    }

                    const downloadResponse = response as DownloadResponse;
                    if (!downloadResponse.link) {
                        throw new Error('No download link provided');
                    }

                    const subtitleResponse = await fetch(downloadResponse.link);
                    if (!subtitleResponse.ok) {
                        throw new Error(`HTTP error! status: ${subtitleResponse.status}`);
                    }
                    subtitleContent = await subtitleResponse.text();
                }
                // Handle direct URL
                else if (selectedSub.url && selectedSub.url !== '' && !selectedSub.url.includes('opensubtitles.org')) {
                    console.log('Loading subtitle from direct URL:', selectedSub.url);
                    const response = await fetch(selectedSub.url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    subtitleContent = await response.text();
                } else {
                    console.warn('No valid fileId or direct URL for subtitle:', selectedSub);
                    updateSubtitleState({ parsedSubtitles: [], currentSubtitle: '', isLoadingSubtitles: false });
                    return;
                }

                const parsed = parseSubtitleFile(subtitleContent);
                updateSubtitleState({ parsedSubtitles: parsed, isLoadingSubtitles: false });

            } catch (error: any) {
                console.error('Failed to load subtitle:', error);
                updateSubtitleState({ parsedSubtitles: [], isLoadingSubtitles: false });
                showAlert("Subtitle Error", `Failed to load subtitle: ${error.message}`);
            }
        };

        loadSubtitle();
    }, [settings.selectedSubtitle, subtitles, openSubtitlesClient, updateSubtitleState]);

    // Update current subtitle based on playback time
    useEffect(() => {
        if (subtitleState.parsedSubtitles.length === 0) {
            if (subtitleState.currentSubtitle !== '') {
                updateSubtitleState({ currentSubtitle: '' });
            }
            return;
        }

        const activeSubtitle = subtitleState.parsedSubtitles.find(
            sub => playerState.currentTime >= sub.start && playerState.currentTime <= sub.end
        );

        const newSubtitleText = activeSubtitle ? activeSubtitle.text : '';
        if (newSubtitleText !== subtitleState.currentSubtitle) {
            updateSubtitleState({ currentSubtitle: newSubtitleText });
        }
    }, [playerState.currentTime, subtitleState.parsedSubtitles, subtitleState.currentSubtitle, updateSubtitleState]);

    // ========================================================================
    // CONTROL FUNCTIONS
    // ========================================================================

    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        controlsOpacity.setValue(1);
        timers.clearTimer('hideControls');
    }, [controlsOpacity, timers]);

    const handleBack = useCallback(async () => {
        await playHaptic();
        const progress = playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0;
        onBack({ message: '', player: "vlc", progress });
    }, [playerState.duration, playerState.currentTime, onBack]);

    const controlActions = useMemo(() => ({
        togglePlayPause: async () => {
            if (!stateRefs.current.isReady) return;
            await playHaptic();
            updatePlayerState({ isPaused: !stateRefs.current.isPlaying });
            showControlsTemporarily();
        },

        seekTo: (absoluteSeconds: number) => {
            if (!playerRef.current || stateRefs.current.duration <= 0) return;

            const clampedTime = Math.max(0, Math.min(stateRefs.current.duration, absoluteSeconds));
            const position = clampedTime / stateRefs.current.duration;

            updatePlayerState({
                isSeeking: true,
                currentTime: clampedTime,
                showBufferingLoader: true
            });
            progressBarValue.setValue(position);

            timers.clearTimer('seekDebounce');
            timers.setTimer('seekDebounce', () => {
                playerRef.current?.seek(position);
            }, 100);

            showControlsTemporarily();
        },

        skipTime: async (offsetSeconds: number) => {
            if (!stateRefs.current.isReady || stateRefs.current.duration <= 0) return;
            await playHaptic();
            controlActions.seekTo(stateRefs.current.currentTime + offsetSeconds);
        },

        toggleMute: async () => {
            await playHaptic();
            updateSettings({ isMuted: !settings.isMuted });
            showControlsTemporarily();
        },
    }), [updatePlayerState, updateSettings, settings.isMuted, showControlsTemporarily, timers, progressBarValue]);

    // ========================================================================
    // VLC EVENT HANDLERS
    // ========================================================================

    const vlcHandlers = useMemo(() => ({
        onLoad: (data: any) => {
            console.log('VLC Player loaded:', data);
            updatePlayerState({
                isBuffering: false,
                isReady: true,
                error: null,
                hasStartedPlaying: true,
                isPlaying: true,
                showBufferingLoader: false,
                isSeeking: false,
                duration: data?.duration ? data.duration / 1000 : 0
            });

            controlsOpacity.setValue(1);
            timers.clearTimer('hideControls');

            if (data?.audioTracks) {
                updateSettings({ availableAudioTracks: data.audioTracks });
            }

            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        },

        onProgress: (data: any) => {
            if (stateRefs.current.isDragging || stateRefs.current.isSeeking) return;

            timers.clearTimer('progressDebounce');
            timers.setTimer('progressDebounce', () => {
                const newCurrentTime = data.currentTime / 1000;
                updatePlayerState({ currentTime: newCurrentTime });

                if (playerState.duration === 0 && data.duration > 0) {
                    updatePlayerState({ duration: data.duration / 1000 });
                }

                if (stateRefs.current.duration > 0) {
                    const progress = newCurrentTime / stateRefs.current.duration;
                    progressBarValue.setValue(Math.max(0, Math.min(1, progress)));
                }
            }, 50);
        },

        onBuffering: (data: any) => {
            timers.clearTimer('bufferingTimeout');

            if (data.isBuffering) {
                timers.setTimer('bufferingTimeout', () => {
                    if (stateRefs.current.isReady) {
                        updatePlayerState({ isBuffering: true, showBufferingLoader: true });
                        Animated.timing(bufferOpacity, {
                            toValue: 1,
                            duration: 150,
                            useNativeDriver: true,
                        }).start();
                    }
                }, 200);
            } else {
                updatePlayerState({
                    isBuffering: false,
                    showBufferingLoader: false,
                    isSeeking: false
                });
                Animated.timing(bufferOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            }
        },

        onPlaying: () => {
            console.log('On Playing');
            updatePlayerState({
                isReady: true,
                isPlaying: true,
                hasStartedPlaying: true,
                isPaused: false,
                isBuffering: false,
                showBufferingLoader: false,
                isSeeking: false
            });
            timers.clearTimer('bufferingTimeout');
            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        },

        onPaused: () => {
            console.log('On Paused');
            updatePlayerState({ isPlaying: false, isPaused: true, isSeeking: false });
        },

        onStopped: () => {
            console.log('On Stopped');
            updatePlayerState({ isPlaying: false, isPaused: false, isSeeking: false });
        },

        onError: (error: any) => {
            console.log('VLC Player error:', error);
            const errorMessage = `Failed to load video.${error?.error ? ` ${error.error}` : ''}`;
            updatePlayerState({
                error: errorMessage,
                isBuffering: false,
                isReady: false,
                showBufferingLoader: false,
                isSeeking: false
            });
            timers.clearTimer('bufferingTimeout');
            showAlert("Video Error", errorMessage);
        }
    }), [updatePlayerState, updateSettings, bufferOpacity, timers, progressBarValue, controlsOpacity, playerState.duration]);

    // ========================================================================
    // SLIDER HANDLERS
    // ========================================================================

    const sliderHandlers = useMemo(() => ({
        handleSliderValueChange: (value: number) => {
            if (!stateRefs.current.isReady || stateRefs.current.duration <= 0) return;
            const newTime = value * stateRefs.current.duration;
            updatePlayerState({
                isDragging: true,
                dragPosition: value,
                currentTime: newTime
            });
            progressBarValue.setValue(value);
        },

        handleSliderSlidingStart: () => {
            updatePlayerState({ isDragging: true });
            showControlsTemporarily();
        },

        handleSliderSlidingComplete: (value: number) => {
            if (!stateRefs.current.isReady || stateRefs.current.duration <= 0) {
                updatePlayerState({ isDragging: false });
                return;
            }
            updatePlayerState({ isDragging: false });
            const newTime = value * stateRefs.current.duration;
            controlActions.seekTo(newTime);
        }
    }), [updatePlayerState, showControlsTemporarily, controlActions, progressBarValue]);

    // ========================================================================
    // MENU HANDLERS
    // ========================================================================

    const selectSubtitle = useCallback(async (index: number) => {
        await playHaptic();
        updateSettings({ selectedSubtitle: index });
        showControlsTemporarily();
    }, [updateSettings, showControlsTemporarily]);

    const selectAudioTrack = useCallback(async (index: number) => {
        await playHaptic();
        updateSettings({ selectedAudioTrack: index });
        showControlsTemporarily();
    }, [updateSettings, showControlsTemporarily]);

    const changePlaybackSpeed = useCallback(async (speed: number) => {
        await playHaptic();
        updateSettings({ playbackSpeed: speed });
        showControlsTemporarily();
    }, [updateSettings, showControlsTemporarily]);

    // ========================================================================
    // GESTURE & OVERLAY HANDLERS
    // ========================================================================

    const handleOverlayPress = useCallback(() => {
        if (showControls) {
            Animated.timing(controlsOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setShowControls(false));
        } else {
            showControlsTemporarily();
        }
    }, [showControls, controlsOpacity, showControlsTemporarily]);

    const handleSeekForward = useCallback(async (seconds: number) => {
        if (!stateRefs.current.isReady || stateRefs.current.duration <= 0) return;
        await playHaptic();
        controlActions.skipTime(seconds);
        setSeekFeedback({ show: true, direction: 'forward', seconds });
        setTimeout(() => setSeekFeedback(prev => ({ ...prev, show: false })), 50);
    }, [controlActions]);

    const handleSeekBackward = useCallback(async (seconds: number) => {
        if (!stateRefs.current.isReady || stateRefs.current.duration <= 0) return;
        await playHaptic();
        controlActions.skipTime(-seconds);
        setSeekFeedback({ show: true, direction: 'backward', seconds });
        setTimeout(() => setSeekFeedback(prev => ({ ...prev, show: false })), 50);
    }, [controlActions]);

    const gestureHandling = useGestureHandling(
        handleSeekForward,
        handleSeekBackward,
        handleOverlayPress,
        timers,
        playerState.isReady
    );

    // ========================================================================
    // ZOOM CONTROLS
    // ========================================================================

    const zoomIn = useCallback(() => {
        setVideoScale(prev => ({
            x: Math.min(prev.x + 0.025, 2.0),
            y: Math.min(prev.y + 0.025, 2.0)
        }));
    }, []);

    const zoomOut = useCallback(() => {
        setVideoScale(prev => ({
            x: Math.max(prev.x - 0.025, 1.0),
            y: Math.max(prev.y - 0.025, 1.0)
        }));
    }, []);

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================

    const displayValues = useMemo(() => {
        const displayTime = playerState.isDragging
            ? playerState.dragPosition * playerState.duration
            : playerState.currentTime;

        const sliderValue = playerState.isDragging
            ? playerState.dragPosition
            : (playerState.duration > 0 ? playerState.currentTime / playerState.duration : 0);

        return { displayTime, sliderValue };
    }, [playerState.isDragging, playerState.dragPosition, playerState.currentTime, playerState.duration]);

    // ========================================================================
    // MEMOIZED COMPONENTS
    // ========================================================================

    const ErrorComponent = useMemo(() => {
        if (!playerState.error) return null;

        return (
            <View style={styles.errorContainer}>
                <TouchableOpacity style={styles.errorBackButton} onPress={handleBack}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <MaterialIcons name="error-outline" size={64} color="#ff6b6b" />
                <Text style={styles.errorTitle}>Playback Error</Text>
                <Text style={styles.errorText}>{playerState.error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => updatePlayerState({
                        error: null,
                        isReady: false,
                        isBuffering: true,
                        hasStartedPlaying: false,
                        isSeeking: false
                    })}
                >
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }, [playerState.error, handleBack, updatePlayerState]);

    const ArtworkComponent = useMemo(() => {
        if (!artwork || playerState.hasStartedPlaying || playerState.error) return null;

        return (
            <View style={styles.artworkContainer}>
                <Image source={{ uri: artwork }} style={styles.artworkImage} resizeMode="cover" />
                <View style={styles.artworkOverlay} />
                <View style={styles.artworkLoadingOverlay}>
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.bufferingText}>Loading...</Text>
                </View>
            </View>
        );
    }, [artwork, playerState.hasStartedPlaying, playerState.error]);

    const BufferingComponent = useMemo(() => {
        if (!(playerState.showBufferingLoader || playerState.isBuffering) || playerState.error) return null;

        return (
            <Animated.View
                style={[styles.bufferingContainer, { opacity: bufferOpacity }]}
                pointerEvents="none"
            >
                <ActivityIndicator size="large" color="#535aff" />
                <Text style={styles.bufferingText}>
                    {playerState.hasStartedPlaying ? "Buffering..." : "Loading..."}
                </Text>
            </Animated.View>
        );
    }, [playerState.showBufferingLoader, playerState.isBuffering, playerState.error, playerState.hasStartedPlaying, bufferOpacity]);

    const SubtitleComponent = useMemo(() => {
        if (!subtitleState.currentSubtitle || playerState.error) return null;

        return (
            <View style={styles.subtitleContainer} pointerEvents="none">
                <Text style={styles.subtitleText}>{subtitleState.currentSubtitle}</Text>
            </View>
        );
    }, [subtitleState.currentSubtitle, playerState.error]);

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <View style={styles.container}>
            {/* VLC Player */}
            {!playerState.error && (
                <VLCPlayer
                    ref={playerRef}
                    style={[
                        styles.video,
                        { transform: [{ scaleX: videoScale.x }, { scaleY: videoScale.y }] }
                    ]}
                    source={{
                        uri: videoUrl,
                        initType: 2,
                        initOptions: [
                            "--network-caching=5000",
                            "--file-caching=1000",
                            "--live-caching=500",
                            "--drop-late-frames",
                            "--skip-frames",
                            "--avcodec-threads=0",
                            "--intf=dummy",
                            "--no-video-title-show",
                            "--quiet"
                        ]
                    }}
                    autoplay={true}
                    playInBackground={true}
                    autoAspectRatio={true}
                    resizeMode="cover"
                    textTrack={-1}
                    acceptInvalidCertificates={true}
                    rate={settings.playbackSpeed}
                    muted={settings.isMuted}
                    audioTrack={settings.selectedAudioTrack}
                    paused={playerState.isPaused}
                    onPlaying={vlcHandlers.onPlaying}
                    onProgress={vlcHandlers.onProgress}
                    onLoad={vlcHandlers.onLoad}
                    onBuffering={vlcHandlers.onBuffering}
                    onPaused={vlcHandlers.onPaused}
                    onStopped={vlcHandlers.onStopped}
                    onError={vlcHandlers.onError}
                />
            )}

            {/* Error, Artwork, and Buffering overlays */}
            {ErrorComponent}
            {ArtworkComponent}
            {BufferingComponent}

            {/* Loading back button */}
            {!playerState.hasStartedPlaying && !playerState.error && (
                <View style={styles.loadingBackButtonContainer} pointerEvents="box-none">
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Touch area for gesture controls */}
            {!playerState.error && (
                <TouchableOpacity
                    style={styles.touchArea}
                    activeOpacity={1}
                    onPress={gestureHandling.handleTouchablePress}
                />
            )}

            {/* Subtitles */}
            {SubtitleComponent}

            {/* Seek feedback */}
            <SeekFeedback {...seekFeedback} />

            {/* Controls overlay */}
            {showControls && !playerState.error && (
                <Animated.View
                    style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
                    pointerEvents="box-none"
                >
                    {/* Top controls */}
                    <View style={styles.topControls}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText} numberOfLines={1}>
                                {title}
                            </Text>
                        </View>

                        <View style={styles.topRightControls}>
                            <TouchableOpacity style={styles.controlButton} onPress={zoomOut}>
                                <MaterialIcons name="zoom-out" size={24} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.controlButton} onPress={zoomIn}>
                                <MaterialIcons name="zoom-in" size={24} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.controlButton} onPress={controlActions.toggleMute}>
                                <Ionicons
                                    name={settings.isMuted ? "volume-mute" : "volume-high"}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <MenuView
                                title="Audio Track"
                                onPressAction={({ nativeEvent }) => {
                                    const trackId = parseInt(nativeEvent.event.replace('audio-', ''));
                                    selectAudioTrack(trackId);
                                }}
                                onCloseMenu={showControlsTemporarily}
                                actions={settings.availableAudioTracks.map((track) => ({
                                    id: `audio-${track.id}`,
                                    title: track.name,
                                    state: settings.selectedAudioTrack === track.id ? 'on' : 'off'
                                }))}
                                themeVariant="dark"
                            >
                                <View style={styles.controlButton}>
                                    <MaterialIcons name="audiotrack" size={24} color="white" />
                                </View>
                            </MenuView>

                            {subtitles.length > 0 && (
                                <MenuView
                                    title="Subtitles"
                                    onPressAction={({ nativeEvent }) => {
                                        if (nativeEvent.event === 'off') {
                                            selectSubtitle(-1);
                                        } else {
                                            const index = parseInt(nativeEvent.event.replace('sub-', ''));
                                            selectSubtitle(index);
                                        }
                                    }}
                                    onCloseMenu={showControlsTemporarily}
                                    actions={[
                                        {
                                            id: 'off',
                                            title: 'Off',
                                            state: settings.selectedSubtitle === -1 ? 'on' : undefined
                                        },
                                        ...subtitles.map((sub, index) => {
                                            let subtitle: string | undefined = undefined;

                                            if (sub.fileId) {
                                                subtitle = 'OpenSubtitles';
                                            } else if (sub.url && !sub.url.includes('opensubtitles.org')) {
                                                subtitle = 'Direct URL';
                                            }

                                            return {
                                                id: `sub-${index}`,
                                                title: sub.label,
                                                subtitle: subtitle,
                                                state: settings.selectedSubtitle === index ? 'on' as const : undefined
                                            };
                                        })
                                    ]}
                                    themeVariant="dark"
                                >
                                    <View style={styles.controlButton}>
                                        <MaterialIcons name="closed-caption" size={24} color="white" />
                                    </View>
                                </MenuView>
                            )}

                            <MenuView
                                title="Playback Speed"
                                onPressAction={({ nativeEvent }) => {
                                    const speed = parseFloat(nativeEvent.event.replace('speed-', ''));
                                    changePlaybackSpeed(speed);
                                }}
                                onCloseMenu={showControlsTemporarily}
                                actions={[0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.1, 1.15, 1.20, 1.25].map(speed => ({
                                    id: `speed-${speed}`,
                                    title: `${speed}x`,
                                    state: settings.playbackSpeed === speed ? 'on' : 'off'
                                }))}
                                themeVariant="dark"
                            >
                                <View style={styles.controlButton}>
                                    <MaterialIcons
                                        name="speed"
                                        size={24}
                                        color={settings.playbackSpeed !== 1.0 ? "#007AFF" : "white"}
                                    />
                                </View>
                            </MenuView>
                        </View>
                    </View>

                    {/* Center controls */}
                    {!playerState.isBuffering && (
                        <View style={styles.centerControls}>
                            <TouchableOpacity
                                style={[styles.skipButton, !playerState.isReady && styles.disabledButton]}
                                onPress={() => controlActions.skipTime(-10)}
                                disabled={!playerState.isReady}
                            >
                                <MaterialIcons
                                    name="replay-10"
                                    size={36}
                                    color={playerState.isReady ? "white" : "rgba(255,255,255,0.5)"}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.playButton, !playerState.isReady && styles.disabledButton]}
                                onPress={controlActions.togglePlayPause}
                                disabled={!playerState.isReady}
                            >
                                <Ionicons
                                    name={playerState.isPlaying ? "pause" : "play"}
                                    size={60}
                                    color={playerState.isReady ? "white" : "rgba(255,255,255,0.5)"}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.skipButton, !playerState.isReady && styles.disabledButton]}
                                onPress={() => controlActions.skipTime(30)}
                                disabled={!playerState.isReady}
                            >
                                <MaterialIcons
                                    name="forward-30"
                                    size={36}
                                    color={playerState.isReady ? "white" : "rgba(255,255,255,0.5)"}
                                />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Bottom controls */}
                    <View style={styles.bottomControls}>
                        <View style={styles.timeContainer}>
                            <Text style={styles.timeText}>
                                {formatTime(displayValues.displayTime)}
                            </Text>
                            <Text style={styles.timeText}>
                                {formatTime(playerState.duration)}
                            </Text>
                        </View>

                        <View style={styles.progressContainerWithMargin}>
                            <Slider
                                style={styles.progressSlider}
                                minimumValue={0}
                                maximumValue={1}
                                value={displayValues.sliderValue}
                                onValueChange={sliderHandlers.handleSliderValueChange}
                                onSlidingStart={sliderHandlers.handleSliderSlidingStart}
                                onSlidingComplete={sliderHandlers.handleSliderSlidingComplete}
                                minimumTrackTintColor="#007AFF"
                                maximumTrackTintColor="rgba(255,255,255,0.4)"
                                thumbTintColor="#fff"
                                thumbSize={25}
                                trackHeight={6}
                                enabled={playerState.isReady || playerState.duration >= 0}
                            />
                        </View>
                    </View>
                </Animated.View>
            )}
        </View>
    );
};

export const MediaPlayer = React.memo(NativeMediaPlayerComponent);