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
}

export const NativeMediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    onBack,
    artwork,
}) => {
    const playerRef = useRef<VLCPlayer>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [selectedSubtitle, setSelectedSubtitle] = useState<number>(-1);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(1);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [volume, setVolume] = useState(70);
    const [isMuted, setIsMuted] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
    const [showAudioSettings, setShowAudioSettings] = useState(false);
    const [showSpeedSettings, setShowSpeedSettings] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [resizeMode, setResizeMode] = useState<PlayerResizeMode>('contain');
    const [showResizeModeLabel, setShowResizeModeLabel] = useState(false);
    const [brightness, setBrightness] = useState(1.0);
    const [showBrightnessSlider, setShowBrightnessSlider] = useState(false);
    const [availableTextTracks, setAvailableTextTracks] = useState<any[]>([]);
    const [availableAudioTracks, setAvailableAudioTracks] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showBufferingLoader, setShowBufferingLoader] = useState(false);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

    // VLC resize mode options
    const resizeModeOptions: PlayerResizeMode[] = [
        "fill",
        "contain",
        "cover",
        "none"
    ];

    // Animated values
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const progressBarValue = useRef(new Animated.Value(0)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;
    const resizeModeLabelOpacity = useRef(new Animated.Value(0)).current;

    // Auto-hide controls timer
    const hideControlsTimer = useRef<any>(null);
    const resizeModeLabelTimer = useRef<any>(null);
    const bufferingTimer = useRef<any>(null);

    // Debounce refs for performance
    const controlsDebounceTimer = useRef<any>(null);
    const progressDebounceTimer = useRef<any>(null);

    useEffect(() => {
        const setupOrientation = async () => {
            try {
                if (Platform.OS !== 'web') {
                    await ScreenOrientation.lockAsync(
                        ScreenOrientation.OrientationLock.LANDSCAPE
                    );
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

            // Clear all timers
            [hideControlsTimer.current, resizeModeLabelTimer.current,
            bufferingTimer.current, controlsDebounceTimer.current,
            progressDebounceTimer.current].forEach(timer => {
                if (timer) clearTimeout(timer);
            });
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

    const onLoadStart = useCallback(() => {
        console.log('VLC Player load start');
        setIsBuffering(true);
        setIsReady(false);
        setError(null);
        setHasStartedPlaying(false);
    }, []);

    const onLoad = useCallback((data: any) => {
        console.log('VLC Player loaded:', data);
        setIsReady(true);
        setHasStartedPlaying(true);
        setError(null);
        console.log(data);
        // Extract available tracks from VLC player
        if (data?.textTracks) {
            setAvailableTextTracks(data.textTracks);
        }

        if (data?.audioTracks) {
            setAvailableAudioTracks(data.audioTracks);
        }

        if (data?.duration) {
            setDuration(data.duration / 1000); // VLC returns milliseconds
        }

        Animated.timing(bufferOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [bufferOpacity]);

    const onProgress = useCallback((data: any) => {
        if (isDragging) return;

        // Debounce progress updates for better performance
        if (progressDebounceTimer.current) {
            clearTimeout(progressDebounceTimer.current);
        }

        progressDebounceTimer.current = setTimeout(() => {
            const { currentTime: current, duration: dur } = data;
            setCurrentTime(current / 1000); // VLC returns milliseconds

            if (duration === 0 && dur > 0) {
                setDuration(dur / 1000); // VLC returns milliseconds
            }

            if (duration > 0) {
                const progress = (current / 1000) / duration;
                progressBarValue.setValue(progress);
            }
        }, 100); // 100ms debounce
    }, [isDragging, duration]);

    const onBuffering = useCallback((data: any) => {
        const { isBuffering: buffering } = data;

        setIsBuffering(buffering);

        if (bufferingTimer.current) {
            clearTimeout(bufferingTimer.current);
        }

        if (buffering && hasStartedPlaying) {
            bufferingTimer.current = setTimeout(() => {
                setShowBufferingLoader(true);
                Animated.timing(bufferOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            }, 600);
        } else {
            setShowBufferingLoader(false);
            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [bufferOpacity, hasStartedPlaying]);

    const onPlaying = useCallback(() => {
        console.log('On Playing');
        setIsPlaying(true);
        setIsPaused(false);
        setIsBuffering(false);
        setShowBufferingLoader(false);

        // Hide buffering overlay
        Animated.timing(bufferOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [bufferOpacity]);

    const onPaused = useCallback(() => {
        console.log('On Paused');
        setIsPlaying(false);
        setIsPaused(true);
    }, []);

    const onStopped = useCallback(() => {
        console.log('On Stopped');
        setIsPlaying(false);
        setIsPaused(false);
    }, []);

    const onError = useCallback((error: any) => {
        console.log('VLC Player error:', error);
        let errorMessage = "Failed to load video.";

        if (error?.error) {
            errorMessage += ` ${error.error}`;
        }

        setError(errorMessage);
        setIsBuffering(false);
        setIsReady(false);
        setShowBufferingLoader(false);

        // Show native alert with detailed error
        Alert.alert("Video Error", errorMessage);
    }, [videoUrl]);

    // Debounced controls show function for better performance
    const showControlsTemporarily = useCallback(() => {
        // Clear existing debounce timer
        if (controlsDebounceTimer.current) {
            clearTimeout(controlsDebounceTimer.current);
        }

        controlsDebounceTimer.current = setTimeout(() => {
            setShowControls(true);

            Animated.timing(controlsOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();

            if (hideControlsTimer.current) {
                clearTimeout(hideControlsTimer.current);
            }

            hideControlsTimer.current = setTimeout(() => {
                if (isPlaying && !showSubtitleSettings && !showAudioSettings && !showSpeedSettings && !showVolumeSlider && !showBrightnessSlider) {
                    Animated.timing(controlsOpacity, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }).start(() => {
                        setShowControls(false);
                    });
                }
            }, 3000); // Increased timeout for better UX
        }, 50); // 50ms debounce for responsiveness
    }, [isPlaying, controlsOpacity, showSubtitleSettings, showAudioSettings, showSpeedSettings, showVolumeSlider, showBrightnessSlider]);

    const playHaptic = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
            console.log('Haptics not supported');
        }
    }

    // Control functions
    const togglePlayPause = useCallback(async () => {
        console.log('On Toggle');
        if (!isReady || !playerRef.current) return;

        await playHaptic();
        if (isPlaying) {
            console.log('Pause');
            setIsPaused(true);
        } else {
            console.log('Resume');
            playerRef.current.resume();
            setIsPaused(false);
        }

        showControlsTemporarily();
    }, [isPlaying, isReady, showControlsTemporarily]);

    const cycleResizeMode = useCallback(async () => {
        console.log('On Resize');
        await playHaptic();
        const currentIndex = resizeModeOptions.indexOf(resizeMode);
        const nextIndex = (currentIndex + 1) % resizeModeOptions.length;

        const nextMode = resizeModeOptions[nextIndex];
        setResizeMode(nextMode);

        console.log('Resize Mode changed to:', nextMode);

        // Show the label briefly
        setShowResizeModeLabel(true);
        Animated.timing(resizeModeLabelOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();

        if (resizeModeLabelTimer.current) {
            clearTimeout(resizeModeLabelTimer.current);
        }

        resizeModeLabelTimer.current = setTimeout(() => {
            Animated.timing(resizeModeLabelOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setShowResizeModeLabel(false);
            });
        }, 1500);

        showControlsTemporarily();
    }, [resizeMode, showControlsTemporarily]);

    const seekTo = useCallback((absoluteSeconds: number) => {
        if (!isReady || duration <= 0 || !playerRef.current) return;

        const clampedTime = Math.max(0, Math.min(duration, absoluteSeconds));
        const position = clampedTime / duration;

        playerRef.current.seek(position);
        setCurrentTime(clampedTime);
        showControlsTemporarily();
    }, [duration, showControlsTemporarily, isReady]);

    const skipTime = useCallback(async (offsetSeconds: number) => {
        if (!isReady || duration <= 0) return;

        await playHaptic();

        const newTime = currentTime + offsetSeconds;
        seekTo(newTime);
    }, [currentTime, duration, seekTo, isReady]);

    const toggleBrightnessSlider = useCallback(async () => {
        console.log('On Toggle Brightness');
        await playHaptic();
        setShowBrightnessSlider(!showBrightnessSlider);
        setShowSubtitleSettings(false);
        setShowAudioSettings(false);
        setShowSpeedSettings(false);
        setShowVolumeSlider(false);
        showControlsTemporarily();
    }, [showBrightnessSlider, showControlsTemporarily]);

    const handleBrightnessChange = useCallback(async (value: number) => {
        console.log('On Handle Brightness');
        setBrightness(value);
        await Brightness.setBrightnessAsync(value)
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    // Fixed mute toggle
    const toggleMute = useCallback(async () => {
        console.log('On Toggle Mute');
        await playHaptic();
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        showControlsTemporarily();
    }, [isMuted, showControlsTemporarily]);

    // Volume slider control
    const toggleVolumeSlider = useCallback(async () => {
        console.log('On Toggle Volume Slider');
        await playHaptic();
        setShowVolumeSlider(!showVolumeSlider);
        setShowSubtitleSettings(false);
        setShowAudioSettings(false);
        setShowSpeedSettings(false);
        setShowBrightnessSlider(false);
        showControlsTemporarily();
    }, [showVolumeSlider, showControlsTemporarily]);

    // Fixed volume handling
    const handleVolumeChange = useCallback((value: number) => {
        console.log('On Handle Volume Change')
        const newVolume = Math.round(value);
        setVolume(newVolume);

        console.log('New Volume', newVolume);
        if (newVolume === 0) {
            setIsMuted(true);
        } else if (isMuted && newVolume > 0) {
            setIsMuted(false);
        }

        showControlsTemporarily();
    }, [isMuted, showControlsTemporarily]);

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

    const changePlaybackSpeed = useCallback(async (speed: number) => {
        console.log('On Change Playback speed');
        await playHaptic();
        setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    // Subtitle selection handler
    const selectSubtitle = useCallback(async (index: number) => {
        console.log('On Select Subtitle:', index);
        await playHaptic();
        setSelectedSubtitle(index);

        showControlsTemporarily();
    }, [showControlsTemporarily]);

    // Audio track selection handler
    const selectAudioTrack = useCallback(async (index: number) => {
        console.log('On Select Audio Track:', index);
        await playHaptic();
        setSelectedAudioTrack(index);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    // Toggle settings panels
    const toggleSubtitleSettings = useCallback(async () => {
        await playHaptic();
        setShowSubtitleSettings(!showSubtitleSettings);
        setShowAudioSettings(false);
        setShowSpeedSettings(false);
        setShowVolumeSlider(false);
        setShowBrightnessSlider(false);
        showControlsTemporarily();
    }, [showSubtitleSettings, showControlsTemporarily]);

    const toggleAudioSettings = useCallback(async () => {
        await playHaptic();
        setShowAudioSettings(!showAudioSettings);
        setShowSubtitleSettings(false);
        setShowSpeedSettings(false);
        setShowVolumeSlider(false);
        setShowBrightnessSlider(false);
        showControlsTemporarily();
    }, [showAudioSettings, showControlsTemporarily]);

    const toggleSpeedSettings = useCallback(async () => {
        await playHaptic();
        setShowSpeedSettings(!showSpeedSettings);
        setShowSubtitleSettings(false);
        setShowAudioSettings(false);
        setShowVolumeSlider(false);
        setShowBrightnessSlider(false);
        showControlsTemporarily();
    }, [showSpeedSettings, showControlsTemporarily]);

    // Fixed progress bar with proper slider functionality
    const handleSliderValueChange = useCallback((value: number) => {
        if (!isReady || duration <= 0) return;

        setIsDragging(true);
        setDragPosition(value);
        progressBarValue.setValue(value);

        const newTime = value * duration;
        setCurrentTime(newTime);
    }, [duration, isReady]);

    const handleSliderSlidingStart = useCallback(() => {
        setIsDragging(true);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleSliderSlidingComplete = useCallback((value: number) => {
        if (!isReady || duration <= 0) {
            setIsDragging(false);
            return;
        }

        setIsDragging(false);
        const newTime = value * duration;
        seekTo(newTime);
    }, [duration, seekTo, isReady]);

    // Close panels when touching outside
    const handleOverlayPress = useCallback(() => {
        if (showSubtitleSettings) {
            setShowSubtitleSettings(false);
        } else if (showAudioSettings) {
            setShowAudioSettings(false);
        } else if (showSpeedSettings) {
            setShowSpeedSettings(false);
        } else if (showVolumeSlider) {
            setShowVolumeSlider(false);
        } else if (showBrightnessSlider) {
            setShowBrightnessSlider(false);
        } else {
            showControlsTemporarily();
        }
    }, [showSubtitleSettings, showAudioSettings, showSpeedSettings, showVolumeSlider, showBrightnessSlider, showControlsTemporarily]);

    const getResizeModeIcon = useCallback(() => {
        switch (resizeMode) {
            case 'contain': return 'fit-screen';
            case 'cover': return 'crop';
            case 'fill': return 'fullscreen';
            case 'none': return 'aspect-ratio';
            default: return 'fit-screen';
        }
    }, [resizeMode]);

    const getResizeModeLabel = useCallback(() => {
        switch (resizeMode) {
            case 'contain': return 'Contain';
            case 'cover': return 'Cover';
            case 'fill': return 'Fill';
            case 'none': return 'Original';
            default: return 'Contain';
        }
    }, [resizeMode]);

    const displayTime = isDragging ? dragPosition * duration : currentTime;
    const sliderValue = isDragging ? dragPosition : (duration > 0 ? currentTime / duration : 0);

    // Calculate volume for display
    const displayVolume = isMuted ? 0 : Math.round(volume);

    return (
        <View style={styles.container}>
            {!error && (
                <VLCPlayer
                    ref={playerRef}
                    style={styles.video}
                    source={{ uri: videoUrl }}
                    autoplay={true}
                    autoAspectRatio={false}
                    resizeMode={resizeMode}
                    rate={playbackSpeed}
                    muted={isMuted}
                    volume={isMuted ? 0 : Math.round(volume)}
                    audioTrack={selectedAudioTrack}
                    textTrack={selectedSubtitle}
                    paused={isPaused}
                    onPlaying={onPlaying}
                    onProgress={onProgress}
                    onLoad={onLoad}
                    onBuffering={onBuffering}
                    onPaused={onPaused}
                    onStopped={onStopped}
                    onError={onError}
                />
            )}

            {error && (
                <View style={styles.errorContainer}>
                    {/* Add back button to error screen */}
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
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => {
                        setError(null);
                        setIsReady(false);
                        setIsBuffering(true);
                        setHasStartedPlaying(false);
                    }}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Show artwork during loading and before first play */}
            {artwork && !hasStartedPlaying && !error && (
                <View style={styles.artworkContainer}>
                    <Image
                        source={{ uri: artwork }}
                        style={styles.artworkImage}
                        resizeMode="cover"
                    />
                    <View style={styles.artworkOverlay} />
                </View>
            )}

            {/* Loading indicator - show during initial loading and delayed buffering */}
            {!error && (
                <Animated.View
                    style={[
                        styles.bufferingContainer,
                        { opacity: bufferOpacity }
                    ]}
                    pointerEvents="none"
                >
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.bufferingText}>
                        {!hasStartedPlaying ? "Loading..." : "Buffering..."}
                    </Text>
                </Animated.View>
            )}

            {/* Resize mode label overlay */}
            {showResizeModeLabel && (
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
            {!error && (
                <TouchableOpacity
                    style={styles.touchArea}
                    activeOpacity={1}
                    onPress={handleOverlayPress}
                />
            )}

            {/* Controls overlay */}
            {showControls && !error && (
                <Animated.View
                    style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
                    pointerEvents="box-none"
                >
                    {/* Top controls */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.8)', 'transparent']}
                        style={styles.topControls}
                    >
                        <TouchableOpacity style={styles.backButton} onPress={async () => { await playHaptic(); onBack(); }}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText} numberOfLines={1}>
                                {title}
                            </Text>
                        </View>

                        <View style={styles.topRightControls}>
                            {/* Mute button with proper state indication */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={toggleMute}
                            >
                                <Ionicons
                                    name={isMuted || displayVolume === 0 ? "volume-mute" : displayVolume < 50 ? "volume-low" : "volume-high"}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {/* Volume slider control */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={toggleVolumeSlider}
                            >
                                <MaterialIcons
                                    name="tune"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {/* Brightness control */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={toggleBrightnessSlider}
                            >
                                <Ionicons
                                    name="sunny"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {/* Resize mode control */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={cycleResizeMode}
                            >
                                <MaterialIcons
                                    name={getResizeModeIcon()}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {/* Subtitle control */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={toggleSubtitleSettings}
                            >
                                <MaterialIcons
                                    name="closed-caption"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {/* Audio track control */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={toggleAudioSettings}
                            >
                                <MaterialIcons
                                    name="audiotrack"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {/* Speed control */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={toggleSpeedSettings}
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
                    {!isBuffering && !showSubtitleSettings && !showAudioSettings && !showSpeedSettings && !showVolumeSlider && !showBrightnessSlider && (
                        <View style={styles.centerControls}>
                            <TouchableOpacity
                                style={[styles.skipButton, !isReady && styles.disabledButton]}
                                onPress={() => skipTime(-10)}
                                disabled={!isReady}
                            >
                                <MaterialIcons
                                    name="replay-10"
                                    size={36}
                                    color={isReady ? "white" : "rgba(255,255,255,0.5)"}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.playButton, !isReady && styles.disabledButton]}
                                onPress={togglePlayPause}
                                disabled={!isReady}
                            >
                                <Ionicons
                                    name={isPlaying ? "pause" : "play"}
                                    size={60}
                                    color={isReady ? "white" : "rgba(255,255,255,0.5)"}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.skipButton, !isReady && styles.disabledButton]}
                                onPress={() => skipTime(30)}
                                disabled={!isReady}
                            >
                                <MaterialIcons
                                    name="forward-30"
                                    size={36}
                                    color={isReady ? "white" : "rgba(255,255,255,0.5)"}
                                />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Bottom controls */}
                    {!showSubtitleSettings && !showAudioSettings && !showSpeedSettings && !showVolumeSlider && !showBrightnessSlider && (
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            style={styles.bottomControls}
                        >
                            <View style={styles.timeContainer}>
                                <Text style={styles.timeText}>
                                    {formatTime(displayTime)}
                                </Text>
                                <Text style={styles.timeText}>
                                    {formatTime(duration)}
                                </Text>
                            </View>

                            {/* Progress bar with proper slider */}
                            <View style={styles.progressContainerWithMargin}>
                                <Slider
                                    style={styles.progressSlider}
                                    minimumValue={0}
                                    maximumValue={1}
                                    value={sliderValue}
                                    onValueChange={handleSliderValueChange}
                                    onSlidingStart={handleSliderSlidingStart}
                                    onSlidingComplete={handleSliderSlidingComplete}
                                    minimumTrackTintColor="#007AFF"
                                    maximumTrackTintColor="rgba(255,255,255,0.3)"
                                    disabled={!isReady || duration <= 0}
                                />
                            </View>
                        </LinearGradient>
                    )}
                </Animated.View>
            )}

            {/* Volume slider with glassmorphism */}
            {showVolumeSlider && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => setShowVolumeSlider(false)}
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
                                maximumValue={100}
                                value={volume}
                                onValueChange={handleVolumeChange}
                                minimumTrackTintColor="#007AFF"
                                maximumTrackTintColor="rgba(255,255,255,0.3)"
                            />
                            <Ionicons name="volume-high" size={20} color="white" />
                            <Text style={styles.volumePercentage}>{Math.round(volume)}%</Text>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Brightness slider with glassmorphism */}
            {showBrightnessSlider && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => setShowBrightnessSlider(false)}
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
                                minimumValue={0.25}
                                maximumValue={1.0}
                                value={brightness}
                                onValueChange={handleBrightnessChange}
                                minimumTrackTintColor="#007AFF"
                                maximumTrackTintColor="rgba(255,255,255,0.3)"
                            />
                            <Ionicons name="sunny" size={20} color="white" />
                            <Text style={styles.brightnessPercentage}>{Math.round(brightness * 100)}%</Text>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Subtitle settings with glassmorphism */}
            {showSubtitleSettings && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => setShowSubtitleSettings(false)}
                >
                    <TouchableOpacity
                        style={styles.glassPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.panelTitle}>Subtitles</Text>
                        <ScrollView style={styles.settingsContent}>
                            {availableTextTracks.map((sub) => (
                                <TouchableOpacity
                                    key={sub.id}
                                    style={[
                                        styles.settingOption,
                                        selectedSubtitle === sub.id && styles.settingOptionSelected
                                    ]}
                                    onPress={() => selectSubtitle(sub.id)}
                                >
                                    <Text style={styles.settingOptionText}>
                                        {sub.name}
                                    </Text>
                                    {selectedSubtitle === sub.id && (
                                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Audio settings with glassmorphism */}
            {showAudioSettings && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => setShowAudioSettings(false)}
                >
                    <TouchableOpacity
                        style={styles.glassPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.panelTitle}>Audio Track</Text>
                        <ScrollView style={styles.settingsContent}>
                            {availableAudioTracks.map((track) => (
                                <TouchableOpacity
                                    key={track.id}
                                    style={[
                                        styles.settingOption,
                                        selectedAudioTrack === -1 && styles.settingOptionSelected
                                    ]}
                                    onPress={() => selectAudioTrack(track.id)}
                                >
                                    <Text style={styles.settingOptionText}>
                                        {track.name}
                                    </Text>
                                    {selectedAudioTrack === track.id && (
                                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Speed settings with glassmorphism */}
            {showSpeedSettings && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => setShowSpeedSettings(false)}
                >
                    <TouchableOpacity
                        style={styles.glassPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.panelTitle}>Playback Speed</Text>
                        <View style={styles.speedOptionsGrid}>
                            {[0.5, 0.75, 0.8, 0.9, 1.0, 1.1, 1.2, 1.25, 1.5, 2.0].map(speed => (
                                <TouchableOpacity
                                    key={speed}
                                    style={[
                                        styles.speedOption,
                                        playbackSpeed === speed && styles.speedOptionSelected
                                    ]}
                                    onPress={() => changePlaybackSpeed(speed)}
                                >
                                    <Text style={[
                                        styles.speedOptionText,
                                        playbackSpeed === speed && styles.speedOptionTextSelected
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
        borderWidth: 1,
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
        borderWidth: 1,
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