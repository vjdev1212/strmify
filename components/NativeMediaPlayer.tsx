import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Platform,
    Image,
    Alert,
} from "react-native";
import debounce from "lodash.debounce";
import { PlayerResizeMode, VLCPlayer } from 'react-native-vlc-media-player';
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import * as Brightness from 'expo-brightness';
import ImmersiveMode from "react-native-immersive-mode";

export interface Subtitle {
    language: string;
    url: string;
    label: string;
}

export interface AudioTrack {
    language: string;
    label: string;
    id: string;
}

export interface Chapter {
    title: string;
    start: number;
    thumbnail?: string;
}

interface MediaPlayerProps {
    videoUrl: string;
    title: string;
    onBack: () => void;
    artwork?: string;
    subtitles?: Subtitle[];
}

// Custom hooks for better state management
const usePlayerState = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showBufferingLoader, setShowBufferingLoader] = useState(false);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

    return {
        isPlaying, setIsPlaying,
        currentTime, setCurrentTime,
        duration, setDuration,
        isBuffering, setIsBuffering,
        isPaused, setIsPaused,
        isReady, setIsReady,
        isDragging, setIsDragging,
        dragPosition, setDragPosition,
        error, setError,
        showBufferingLoader, setShowBufferingLoader,
        hasStartedPlaying, setHasStartedPlaying
    };
};

const useUIState = () => {
    const [showControls, setShowControls] = useState(true);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
    const [showAudioSettings, setShowAudioSettings] = useState(false);
    const [showSpeedSettings, setShowSpeedSettings] = useState(false);
    const [showBrightnessSlider, setShowBrightnessSlider] = useState(false);
    const [showResizeModeLabel, setShowResizeModeLabel] = useState(false);

    const hideAllPanels = () => {
        setShowVolumeSlider(false);
        setShowSubtitleSettings(false);
        setShowAudioSettings(false);
        setShowSpeedSettings(false);
        setShowBrightnessSlider(false);
    };

    return {
        showControls, setShowControls,
        showVolumeSlider, setShowVolumeSlider,
        showSubtitleSettings, setShowSubtitleSettings,
        showAudioSettings, setShowAudioSettings,
        showSpeedSettings, setShowSpeedSettings,
        showBrightnessSlider, setShowBrightnessSlider,
        showResizeModeLabel, setShowResizeModeLabel,
        hideAllPanels
    };
};

const usePlayerSettings = () => {
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [resizeMode, setResizeMode] = useState<PlayerResizeMode>('fill');
    const [brightness, setBrightness] = useState<number>(1);
    const [selectedSubtitle, setSelectedSubtitle] = useState<number>(-1);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(1);
    const [availableTextTracks, setAvailableTextTracks] = useState<any[]>([]);
    const [availableAudioTracks, setAvailableAudioTracks] = useState<any[]>([]);

    return {
        volume, setVolume,
        isMuted, setIsMuted,
        playbackSpeed, setPlaybackSpeed,
        resizeMode, setResizeMode,
        brightness, setBrightness,
        selectedSubtitle, setSelectedSubtitle,
        selectedAudioTrack, setSelectedAudioTrack,
        availableTextTracks, setAvailableTextTracks,
        availableAudioTracks, setAvailableAudioTracks
    };
};

const useTimers = () => {
    const hideControlsTimer = useRef<any>(null);
    const resizeModeLabelTimer = useRef<any>(null);
    const bufferingTimer = useRef<any>(null);
    const controlsDebounceTimer = useRef<any>(null);
    const progressDebounceTimer = useRef<any>(null);

    const clearAllTimers = () => {
        [hideControlsTimer.current, resizeModeLabelTimer.current, bufferingTimer.current,
        controlsDebounceTimer.current, progressDebounceTimer.current]
            .forEach(timer => timer && clearTimeout(timer));
    };

    return {
        hideControlsTimer,
        resizeModeLabelTimer,
        bufferingTimer,
        controlsDebounceTimer,
        progressDebounceTimer,
        clearAllTimers
    };
};

export const NativeMediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    onBack,
    artwork,
    subtitles = []
}) => {
    const playerRef = useRef<VLCPlayer>(null);
    const playerState = usePlayerState();
    const uiState = useUIState();
    const settings = usePlayerSettings();
    const timers = useTimers();

    // Animated values
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const progressBarValue = useRef(new Animated.Value(0)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;
    const resizeModeLabelOpacity = useRef(new Animated.Value(0)).current;

    const resizeModeOptions: PlayerResizeMode[] = ["fill", "contain", "cover", "none"];

    // Setup and cleanup
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
    }, []);

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

    // Utility functions
    const playHaptic = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
            console.log('Haptics not supported');
        }
    };

    const formatTime = useCallback((seconds: number) => {
        if (isNaN(seconds) || seconds < 0) return "0:00";
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const getResizeModeIcon = () => {
        switch (settings.resizeMode) {
            case 'contain': return 'aspect-ratio';
            case 'cover': return 'crop';
            case 'fill': return 'fullscreen';
            case 'none': return 'photo-size-select-actual';
            case 'scale-down': return 'zoom-out-map';
            default: return 'aspect-ratio';
        }
    };

    const getResizeModeLabel = () => {
        switch (settings.resizeMode) {
            case 'contain': return 'Contain';
            case 'cover': return 'Cover';
            case 'fill': return 'Fill';
            case 'none': return 'Original';
            case 'scale-down': return 'Scale Down';
            default: return 'Contain';
        }
    };

    // Debounced controls show function
    const showControlsTemporarily = useCallback(() => {
        if (timers.controlsDebounceTimer.current) {
            clearTimeout(timers.controlsDebounceTimer.current);
        }

        timers.controlsDebounceTimer.current = setTimeout(() => {
            uiState.setShowControls(true);

            Animated.timing(controlsOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();

            if (timers.hideControlsTimer.current) {
                clearTimeout(timers.hideControlsTimer.current);
            }

            timers.hideControlsTimer.current = setTimeout(() => {
                if (playerState.isPlaying && !uiState.showSubtitleSettings && !uiState.showAudioSettings &&
                    !uiState.showSpeedSettings && !uiState.showVolumeSlider && !uiState.showBrightnessSlider) {
                    Animated.timing(controlsOpacity, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }).start(() => {
                        uiState.setShowControls(false);
                    });
                }
            }, 3000);
        }, 50);
    }, [playerState.isPlaying, controlsOpacity, uiState, timers]);

    // VLC Event Handlers
    const vlcHandlers = useMemo(() => ({
        onLoad: (data: any) => {
            console.log('VLC Player loaded:', data);
            playerState.setIsBuffering(false);
            playerState.setIsReady(false);
            playerState.setError(null);
            playerState.setHasStartedPlaying(true);
            playerState.setShowBufferingLoader(false);

            if (data?.textTracks) {
                settings.setAvailableTextTracks(data.textTracks);
            }
            if (data?.audioTracks) {
                settings.setAvailableAudioTracks(data.audioTracks);
            }
            if (data?.duration) {
                playerState.setDuration(data.duration / 1000);
            }

            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        },

        onProgress: (data: any) => {
            if (playerState.isDragging) return;

            if (timers.progressDebounceTimer.current) {
                clearTimeout(timers.progressDebounceTimer.current);
            }

            timers.progressDebounceTimer.current = setTimeout(() => {
                const { currentTime: current, duration: dur } = data;
                playerState.setCurrentTime(current / 1000);

                if (playerState.duration === 0 && dur > 0) {
                    playerState.setDuration(dur / 1000);
                }

                if (playerState.duration > 0) {
                    const progress = (current / 1000) / playerState.duration;
                    progressBarValue.setValue(progress);
                }
            }, 100);
        },

        onBuffering: (data: any) => {
            const { isBuffering: buffering } = data;
            playerState.setIsBuffering(buffering);

            if (timers.bufferingTimer.current) {
                clearTimeout(timers.bufferingTimer.current);
            }

            if (buffering) {
                // Show buffering immediately for better UX
                playerState.setShowBufferingLoader(true);
                Animated.timing(bufferOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            } else {
                playerState.setShowBufferingLoader(false);
                Animated.timing(bufferOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            }
        },

        onPlaying: () => {
            console.log('On Playing');
            playerState.setIsReady(true);
            playerState.setIsPlaying(true);
            playerState.setHasStartedPlaying(true);
            playerState.setIsPaused(false);
            playerState.setIsBuffering(false);
            playerState.setShowBufferingLoader(false);

            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        },

        onPaused: () => {
            console.log('On Paused');
            playerState.setIsPlaying(false);
            playerState.setIsPaused(true);
        },

        onStopped: () => {
            console.log('On Stopped');
            playerState.setIsPlaying(false);
            playerState.setIsPaused(false);
        },

        onError: (error: any) => {
            console.log('VLC Player error:', error);
            let errorMessage = "Failed to load video.";
            if (error?.error) {
                errorMessage += ` ${error.error}`;
            }

            playerState.setError(errorMessage);
            playerState.setIsBuffering(false);
            playerState.setIsReady(false);
            playerState.setShowBufferingLoader(false);
            Alert.alert("Video Error", errorMessage);
        }
    }), [playerState, settings, bufferOpacity, timers, progressBarValue]);

    // Control actions
    const controlActions = useMemo(() => ({
        togglePlayPause: async () => {
            console.log('On Toggle');
            if (!playerState.isReady || !playerRef.current) return;

            await playHaptic();
            if (playerState.isPlaying) {
                console.log('Pause');
                playerState.setIsPaused(true);
            } else {
                console.log('Resume');
                playerState.setIsPaused(false);
            }
            showControlsTemporarily();
        },

        seekTo: (absoluteSeconds: number) => {
            if (!playerState.isReady || playerState.duration <= 0 || !playerRef.current) return;

            const clampedTime = Math.max(0, Math.min(playerState.duration, absoluteSeconds));
            const position = clampedTime / playerState.duration;

            playerRef.current.seek(position);
            playerState.setCurrentTime(clampedTime);
            showControlsTemporarily();
        },

        skipTime: async (offsetSeconds: number) => {
            if (!playerState.isReady || playerState.duration <= 0) return;

            await playHaptic();
            const newTime = playerState.currentTime + offsetSeconds;
            controlActions.seekTo(newTime);
        },

        cycleResizeMode: async () => {
            console.log('On Resize');
            await playHaptic();
            const currentIndex = resizeModeOptions.indexOf(settings.resizeMode);
            const nextIndex = (currentIndex + 1) % resizeModeOptions.length;
            const nextMode = resizeModeOptions[nextIndex];
            settings.setResizeMode(nextMode);

            console.log('Resize Mode changed to:', nextMode);

            uiState.setShowResizeModeLabel(true);
            Animated.timing(resizeModeLabelOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();

            if (timers.resizeModeLabelTimer.current) {
                clearTimeout(timers.resizeModeLabelTimer.current);
            }

            timers.resizeModeLabelTimer.current = setTimeout(() => {
                Animated.timing(resizeModeLabelOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    uiState.setShowResizeModeLabel(false);
                });
            }, 1500);

            showControlsTemporarily();
        },

        toggleMute: async () => {
            console.log('On Toggle Mute');
            await playHaptic();
            settings.setIsMuted(!settings.isMuted);
            showControlsTemporarily();
        },

        handleVolumeChange: (value: number) => {
            console.log('On Handle Volume Change');
            const newVolume = value;
            settings.setVolume(newVolume);

            console.log('New Volume', newVolume);

            if (newVolume === 0) {
                settings.setIsMuted(true);
            } else if (settings.isMuted && newVolume > 0) {
                settings.setIsMuted(false);
            }
            showControlsTemporarily();
        },

        handleBrightnessChange: async (value: number) => {
            settings.setBrightness(value);
            try {
                const { status } = await Brightness.requestPermissionsAsync();
                if (status === 'granted') {
                    await Brightness.setSystemBrightnessAsync(value);
                }
            } catch (error) {
                console.log('Failed to set brightness:', error);
            }
            showControlsTemporarily();
        }
    }), [playerState, settings, showControlsTemporarily, resizeModeOptions, timers, resizeModeLabelOpacity, uiState]);

    // Slider handlers
    const sliderHandlers = useMemo(() => ({
        handleSliderValueChange: (value: number) => {
            if (!playerState.isReady || playerState.duration <= 0) return;

            playerState.setIsDragging(true);
            playerState.setDragPosition(value);
            progressBarValue.setValue(value);

            const newTime = value * playerState.duration;
            playerState.setCurrentTime(newTime);
        },

        handleSliderSlidingStart: () => {
            playerState.setIsDragging(true);
            showControlsTemporarily();
        },

        handleSliderSlidingComplete: (value: number) => {
            if (!playerState.isReady || playerState.duration <= 0) {
                playerState.setIsDragging(false);
                return;
            }

            playerState.setIsDragging(false);
            const newTime = value * playerState.duration;
            controlActions.seekTo(newTime);
        }
    }), [playerState, showControlsTemporarily, controlActions, progressBarValue]);

    // Panel toggles
    const panelToggles = useMemo(() => ({
        toggleVolumeSlider: async () => {
            console.log('On Toggle Volume Slider');
            await playHaptic();
            uiState.setShowVolumeSlider(!uiState.showVolumeSlider);
            uiState.setShowSubtitleSettings(false);
            uiState.setShowAudioSettings(false);
            uiState.setShowSpeedSettings(false);
            uiState.setShowBrightnessSlider(false);
            showControlsTemporarily();
        },

        toggleBrightnessSlider: async () => {
            await playHaptic();
            uiState.setShowBrightnessSlider(!uiState.showBrightnessSlider);
            uiState.setShowSubtitleSettings(false);
            uiState.setShowAudioSettings(false);
            uiState.setShowSpeedSettings(false);
            uiState.setShowVolumeSlider(false);
            showControlsTemporarily();
        },

        toggleSubtitleSettings: async () => {
            await playHaptic();
            uiState.setShowSubtitleSettings(!uiState.showSubtitleSettings);
            uiState.setShowAudioSettings(false);
            uiState.setShowSpeedSettings(false);
            uiState.setShowVolumeSlider(false);
            uiState.setShowBrightnessSlider(false);
            showControlsTemporarily();
        },

        toggleAudioSettings: async () => {
            await playHaptic();
            uiState.setShowAudioSettings(!uiState.showAudioSettings);
            uiState.setShowSubtitleSettings(false);
            uiState.setShowSpeedSettings(false);
            uiState.setShowVolumeSlider(false);
            uiState.setShowBrightnessSlider(false);
            showControlsTemporarily();
        },

        toggleSpeedSettings: async () => {
            await playHaptic();
            uiState.setShowSpeedSettings(!uiState.showSpeedSettings);
            uiState.setShowSubtitleSettings(false);
            uiState.setShowAudioSettings(false);
            uiState.setShowVolumeSlider(false);
            uiState.setShowBrightnessSlider(false);
            showControlsTemporarily();
        }
    }), [uiState, showControlsTemporarily]);

    // Selection handlers
    const selectSubtitle = useCallback(async (index: number) => {
        console.log('On Select Subtitle:', index);
        await playHaptic();
        settings.setSelectedSubtitle(index);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const selectAudioTrack = useCallback(async (index: number) => {
        console.log('On Select Audio Track:', index);
        await playHaptic();
        settings.setSelectedAudioTrack(index);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const changePlaybackSpeed = useCallback(async (speed: number) => {
        console.log('On Change Playback speed');
        await playHaptic();
        settings.setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const handleOverlayPress = useCallback(() => {
        if (uiState.showSubtitleSettings || uiState.showAudioSettings || uiState.showSpeedSettings ||
            uiState.showVolumeSlider || uiState.showBrightnessSlider) {
            uiState.hideAllPanels();
        } else {
            if (uiState.showControls) {
                Animated.timing(controlsOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    uiState.setShowControls(false);
                });
            } else {
                showControlsTemporarily();
            }
        }
    }, [uiState, controlsOpacity, showControlsTemporarily]);

    const displayTime = playerState.isDragging ? playerState.dragPosition * playerState.duration : playerState.currentTime;
    const sliderValue = playerState.isDragging ? playerState.dragPosition : (playerState.duration > 0 ? playerState.currentTime / playerState.duration : 0);
    const displayVolume = settings.isMuted ? 0 : settings.volume;

    return (
        <View style={styles.container}>
            {!playerState.error && (
                <VLCPlayer
                    ref={playerRef}
                    style={styles.video}
                    source={{
                        uri: videoUrl,
                        initType: 2,
                        initOptions: [
                            "--network-caching=1000"
                        ],
                    }}
                    autoplay={true}
                    autoAspectRatio={true}
                    resizeMode={settings.resizeMode}
                    playInBackground={true}
                    acceptInvalidCertificates={true}
                    rate={settings.playbackSpeed}
                    muted={settings.isMuted}
                    volume={settings.isMuted ? 0 : settings.volume}
                    audioTrack={settings.selectedAudioTrack}
                    textTrack={settings.selectedSubtitle}
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

            {playerState.error && (
                <View style={styles.errorContainer}>
                    <TouchableOpacity
                        style={styles.errorBackButton}
                        onPress={async () => {
                            await playHaptic();
                            onBack();
                        }}
                    >
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>

                    <MaterialIcons name="error-outline" size={64} color="#ff6b6b" />
                    <Text style={styles.errorTitle}>Playback Error</Text>
                    <Text style={styles.errorText}>{playerState.error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => {
                        playerState.setError(null);
                        playerState.setIsReady(false);
                        playerState.setIsBuffering(true);
                        playerState.setHasStartedPlaying(false);
                    }}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Show artwork during loading */}
            {artwork && !playerState.hasStartedPlaying && !playerState.error && (
                <View style={styles.artworkContainer}>
                    <Image
                        source={{ uri: artwork }}
                        style={styles.artworkImage}
                        resizeMode="cover"
                    />
                    <View style={styles.artworkOverlay} />
                    <View style={styles.artworkLoadingOverlay}>
                        <ActivityIndicator size="large" color="#535aff" />
                        <Text style={styles.bufferingText}>Loading...</Text>
                    </View>
                </View>
            )}

            {/* Loading indicator - show during any buffering */}
            {(playerState.showBufferingLoader || playerState.isBuffering) && !playerState.error && (
                <Animated.View
                    style={[
                        styles.bufferingContainer,
                        { opacity: bufferOpacity }
                    ]}
                    pointerEvents="none"
                >
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.bufferingText}>
                        {playerState.hasStartedPlaying ? "Buffering..." : "Loading..."}
                    </Text>
                </Animated.View>
            )}

            {/* Resize mode label overlay */}
            {uiState.showResizeModeLabel && (
                <Animated.View
                    style={[
                        styles.resizeModeLabelOverlay,
                        { opacity: resizeModeLabelOpacity }
                    ]}
                    pointerEvents="none"
                >
                    <View style={styles.resizeModeLabelContainer}>
                        <MaterialIcons
                            name={getResizeModeIcon()}
                            size={32}
                            color="white"
                        />
                        <Text style={styles.resizeModeLabelText}>
                            {getResizeModeLabel()}
                        </Text>
                    </View>
                </Animated.View>
            )}

            {/* Touch area for showing controls */}
            {!playerState.error && (
                <TouchableOpacity
                    style={styles.touchArea}
                    activeOpacity={1}
                    onPress={handleOverlayPress}
                />
            )}

            {/* Controls overlay */}
            {uiState.showControls && !playerState.error && (
                <Animated.View
                    style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
                    pointerEvents="box-none"
                >
                    {/* Top controls */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.8)', 'transparent']}
                        style={styles.topControls}
                    >
                        <TouchableOpacity style={styles.backButton} onPress={async () => {
                            await playHaptic();
                            onBack();
                        }}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText} numberOfLines={1}>
                                {title}
                            </Text>
                        </View>

                        <View style={styles.topRightControls}>
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={controlActions.toggleMute}
                            >
                                <Ionicons
                                    name={settings.isMuted || displayVolume === 0 ? "volume-mute" : displayVolume < 0.25 ? "volume-low" : "volume-high"}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={panelToggles.toggleVolumeSlider}
                            >
                                <MaterialIcons
                                    name="tune"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={panelToggles.toggleBrightnessSlider}
                            >
                                <Ionicons
                                    name="sunny"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={controlActions.cycleResizeMode}
                            >
                                <MaterialIcons
                                    name={getResizeModeIcon()}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={panelToggles.toggleSubtitleSettings}
                            >
                                <MaterialIcons
                                    name="closed-caption"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={panelToggles.toggleAudioSettings}
                            >
                                <MaterialIcons
                                    name="audiotrack"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={panelToggles.toggleSpeedSettings}
                            >
                                <MaterialIcons
                                    name="speed"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* Center controls - Hidden during buffering */}
                    {!playerState.isBuffering && !uiState.showSubtitleSettings && !uiState.showAudioSettings && !uiState.showSpeedSettings && !uiState.showVolumeSlider && !uiState.showBrightnessSlider && (
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
                    {!uiState.showSubtitleSettings && !uiState.showAudioSettings && !uiState.showSpeedSettings && !uiState.showVolumeSlider && !uiState.showBrightnessSlider && (
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            style={styles.bottomControls}
                        >
                            <View style={styles.timeContainer}>
                                <Text style={styles.timeText}>
                                    {formatTime(displayTime)}
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
                                    value={sliderValue}
                                    onValueChange={sliderHandlers.handleSliderValueChange}
                                    onSlidingStart={sliderHandlers.handleSliderSlidingStart}
                                    onSlidingComplete={sliderHandlers.handleSliderSlidingComplete}
                                    minimumTrackTintColor="#007AFF"
                                    maximumTrackTintColor="rgba(255,255,255,0.3)"
                                    disabled={!playerState.isReady || playerState.duration <= 0}
                                />
                            </View>
                        </LinearGradient>
                    )}
                </Animated.View>
            )}

            {/* Volume slider with glassmorphism */}
            {uiState.showVolumeSlider && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => uiState.setShowVolumeSlider(false)}
                >
                    <TouchableOpacity
                        style={styles.glassPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.panelTitle}>Volume</Text>
                        <View style={styles.volumeControls}>
                            <Ionicons name="volume-low" size={20} color="white" />
                            <Slider
                                style={styles.volumeSlider}
                                minimumValue={0}
                                maximumValue={1}
                                value={settings.volume}
                                onValueChange={controlActions.handleVolumeChange}
                                minimumTrackTintColor="#007AFF"
                                maximumTrackTintColor="rgba(255,255,255,0.3)"
                            />
                            <Ionicons name="volume-high" size={20} color="white" />
                            <Text style={styles.volumePercentage}>{Math.round(settings.volume * 100)}%</Text>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Brightness slider with glassmorphism */}
            {uiState.showBrightnessSlider && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => uiState.setShowBrightnessSlider(false)}
                >
                    <TouchableOpacity
                        style={styles.glassPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.panelTitle}>Brightness</Text>
                        <View style={styles.brightnessControls}>
                            <Ionicons name="sunny-outline" size={20} color="white" />
                            <Slider
                                style={styles.brightnessSlider}
                                minimumValue={0}
                                maximumValue={1}
                                value={settings.brightness}
                                onValueChange={controlActions.handleBrightnessChange}
                                minimumTrackTintColor="#007AFF"
                                maximumTrackTintColor="rgba(255,255,255,0.3)"
                            />
                            <Ionicons name="sunny" size={20} color="white" />
                            <Text style={styles.brightnessPercentage}>{Math.round(settings.brightness * 100)}%</Text>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Subtitle settings with glassmorphism */}
            {uiState.showSubtitleSettings && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => uiState.setShowSubtitleSettings(false)}
                >
                    <TouchableOpacity
                        style={styles.glassPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.panelTitle}>Subtitles</Text>
                        <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
                            {settings.availableTextTracks.map((sub) => (
                                <TouchableOpacity
                                    key={sub.id}
                                    style={[
                                        styles.settingOption,
                                        settings.selectedSubtitle === sub.id && styles.settingOptionSelected
                                    ]}
                                    onPress={() => selectSubtitle(sub.id)}
                                >
                                    <Text style={styles.settingOptionText}>
                                        {sub.name}
                                    </Text>
                                    {settings.selectedSubtitle === sub.id && (
                                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Audio settings with glassmorphism */}
            {uiState.showAudioSettings && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => uiState.setShowAudioSettings(false)}
                >
                    <TouchableOpacity
                        style={styles.glassPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.panelTitle}>Audio Track</Text>
                        <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
                            {settings.availableAudioTracks.map((track) => (
                                <TouchableOpacity
                                    key={track.id}
                                    style={[
                                        styles.settingOption,
                                        settings.selectedAudioTrack === track.id && styles.settingOptionSelected
                                    ]}
                                    onPress={() => selectAudioTrack(track.id)}
                                >
                                    <Text style={styles.settingOptionText}>
                                        {track.name}
                                    </Text>
                                    {settings.selectedAudioTrack === track.id && (
                                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Speed settings with glassmorphism */}
            {uiState.showSpeedSettings && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => uiState.setShowSpeedSettings(false)}
                >
                    <TouchableOpacity
                        style={styles.glassPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.panelTitle}>Playback Speed</Text>
                        <View style={styles.speedOptionsGrid}>
                            {[0.75, 0.8, 0.9, 1.0, 1.1, 1.2, 1.25].map(speed => (
                                <TouchableOpacity
                                    key={speed}
                                    style={[
                                        styles.speedOption,
                                        settings.playbackSpeed === speed && styles.speedOptionSelected
                                    ]}
                                    onPress={() => changePlaybackSpeed(speed)}
                                >
                                    <Text style={[
                                        styles.speedOptionText,
                                        settings.playbackSpeed === speed && styles.speedOptionTextSelected
                                    ]}>
                                        {speed}x
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    touchArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        padding: 40,
    },
    errorTitle: {
        color: '#ff6b6b',
        fontSize: 24,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 12,
        textAlign: 'center',
    },
    errorText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    controlsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
    },
    topControls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
        marginRight: 16,
    },
    titleContainer: {
        flex: 1,
        marginRight: 16,
    },
    titleText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    topRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlButton: {
        padding: 8,
        marginLeft: 12,
    },
    centerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 60,
    },
    skipButton: {
        padding: 20,
        marginHorizontal: 20,
    },
    playButton: {
        padding: 16,
        marginHorizontal: 30,
    },
    disabledButton: {
        opacity: 0.5,
    },
    bottomControls: {
        paddingHorizontal: 40,
        paddingBottom: 40,
        paddingTop: 20,
        height: 120,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressContainerWithMargin: {
        marginBottom: 16,
        paddingVertical: 10,
    },
    progressSlider: {
        width: '100%',
        height: 40,
    },
    timeText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
        marginHorizontal: 10
    },
    bufferingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 10,
    },
    bufferingText: {
        color: 'white',
        fontSize: 16,
        marginTop: 8,
    },
    resizeModeLabelOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -75 }, { translateY: -50 }],
        zIndex: 5,
    },
    resizeModeLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    resizeModeLabelText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    artworkContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    artworkImage: {
        width: '100%',
        height: '100%',
    },
    artworkOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    artworkLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    glassOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    glassPanel: {
        backgroundColor: 'rgba(40, 40, 40, 0.95)',
        borderRadius: 12,
        padding: 24,
        minWidth: 320,
        maxWidth: '85%',
        maxHeight: '70%',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    panelTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    settingsContent: {
        maxHeight: 300,
    },
    settingOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    settingOptionSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.2)',
        borderColor: 'rgba(0, 122, 255, 0.4)',
    },
    settingOptionText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    volumeControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    volumeSlider: {
        flex: 1,
        height: 40,
        marginHorizontal: 15,
    },
    volumePercentage: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        minWidth: 45,
        textAlign: 'center',
        marginLeft: 10,
    },
    brightnessControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brightnessSlider: {
        flex: 1,
        height: 40,
        marginHorizontal: 15,
    },
    brightnessPercentage: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        minWidth: 45,
        textAlign: 'center',
        marginLeft: 10,
    },
    speedOptionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    speedOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 60,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    speedOptionSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.3)',
        borderColor: 'rgba(0, 122, 255, 0.5)',
    },
    speedOptionText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    speedOptionTextSelected: {
        fontWeight: '700',
        color: '#007AFF',
    },
    errorBackButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        padding: 8,
        zIndex: 1,
    },
});