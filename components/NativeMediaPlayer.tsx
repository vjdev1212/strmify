import React, { useEffect, useRef, useState, useCallback } from "react";
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
import { PlayerResizeMode, VLCPlayer } from 'react-native-vlc-media-player';
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

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
    subtitle?: string;
    subtitles?: Subtitle[];
    audioTracks?: AudioTrack[];
    chapters?: Chapter[];
    onBack: () => void;
    autoPlay?: boolean;
    artwork?: string;
}

export const NativeMediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    subtitle,
    subtitles = [],
    audioTracks = [],
    chapters = [],
    onBack,
    autoPlay = true,
    artwork,
}) => {
    const playerRef = useRef<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [selectedSubtitle, setSelectedSubtitle] = useState<number>(-1);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [volume, setVolume] = useState(70);
    const [isMuted, setIsMuted] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showChapters, setShowChapters] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
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

    // VLC resize mode options
    const resizeModeOptions = ['none', 'contain', 'cover', 'stretch'];

    // Animated values
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const progressBarValue = useRef(new Animated.Value(0)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;
    const resizeModeLabelOpacity = useRef(new Animated.Value(0)).current;

    // Auto-hide controls timer
    const hideControlsTimer = useRef<any>(null);
    const resizeModeLabelTimer = useRef<any>(null);

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

            if (hideControlsTimer.current) {
                clearTimeout(hideControlsTimer.current);
            }
            if (resizeModeLabelTimer.current) {
                clearTimeout(resizeModeLabelTimer.current);
            }
        };
    }, []);

    const onOpen = useCallback(() => {
        console.log('VLC Player opened');
        setIsBuffering(false);
        setIsReady(true);
        setError(null);

        Animated.timing(bufferOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [bufferOpacity]);

    const onLoadStart = useCallback(() => {
        console.log('VLC Player load start');
        setIsBuffering(true);
        setIsReady(false);
    }, []);

    const onProgress = useCallback((data: any) => {
        if (isDragging) return;

        const { currentTime: current, duration: dur } = data;
        setCurrentTime(current / 1000); // VLC returns milliseconds
        
        if (duration === 0 && dur > 0) {
            setDuration(dur / 1000); // VLC returns milliseconds
        }

        if (duration > 0) {
            const progress = (current / 1000) / duration;
            progressBarValue.setValue(progress);
        }
    }, [isDragging, duration]);

    const onBuffering = useCallback((data: any) => {
        const { isBuffering: buffering } = data;
        
        if (buffering && isReady) {
            setIsBuffering(true);
            Animated.timing(bufferOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        } else if (!buffering) {
            setIsBuffering(false);
            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [bufferOpacity, isReady]);

    const onPlaying = useCallback(() => {
        setIsPlaying(true);
        setIsBuffering(false);
    }, []);

    const onPaused = useCallback(() => {
        setIsPlaying(false);
    }, []);

    const onStopped = useCallback(() => {
        setIsPlaying(false);
    }, []);

    const onError = useCallback((error: any) => {
        console.log('VLC Player error:', error);
        let errorMessage = "Failed to load video.";
        
        if (error?.error) {
            errorMessage += ` ${error.error}`;
        }
        
        // Check for .mkv file format issue
        if (videoUrl.toLowerCase().includes('.mkv')) {
            errorMessage += " Note: Some MKV files may have compatibility issues.";
        }
        
        setError(errorMessage);
        setIsBuffering(false);
        setIsReady(false);
        
        // Show native alert with detailed error
        Alert.alert("Video Error", errorMessage);
    }, [videoUrl]);

    const showControlsTemporarily = useCallback(() => {
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
            if (isPlaying && !showSettings && !showChapters && !showVolumeSlider && !showBrightnessSlider) {
                Animated.timing(controlsOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => {
                    setShowControls(false);
                });
            }
        }, 1500);
    }, [isPlaying, controlsOpacity, showSettings, showChapters, showVolumeSlider, showBrightnessSlider]);

    const playHaptic = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
            console.log('Haptics not supported');
        }
    }

    // Control functions
    const togglePlayPause = useCallback(async () => {
        if (!isReady || !playerRef.current) return;

        await playHaptic();
        
        if (isPlaying) {
            playerRef.current.pause();
        } else {
            playerRef.current.resume();
        }
        
        showControlsTemporarily();
    }, [isPlaying, isReady, showControlsTemporarily]);

    const cycleResizeMode = useCallback(async () => {
        await playHaptic();
        const currentIndex = resizeModeOptions.indexOf(resizeMode);
        const nextIndex = (currentIndex + 1) % resizeModeOptions.length;
        setResizeMode(resizeModeOptions[nextIndex] as PlayerResizeMode);

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
        }, 1000);

        showControlsTemporarily();
    }, [resizeMode, showControlsTemporarily]);

    const seekTo = useCallback((seconds: number) => {
        if (!isReady || duration <= 0 || !playerRef.current) return;

        const clampedTime = Math.max(0, Math.min(duration, seconds));
        const seekTimeMs = clampedTime * 1000; // Convert to milliseconds for VLC
        
        playerRef.current.seek(seekTimeMs);
        setCurrentTime(clampedTime);
        showControlsTemporarily();
    }, [duration, showControlsTemporarily, isReady]);

    const skipTime = useCallback(async (seconds: number) => {
        if (!isReady || duration <= 0) return;

        await playHaptic();
        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        seekTo(newTime);
    }, [currentTime, duration, seekTo, isReady]);

    const toggleBrightnessSlider = useCallback(async () => {
        await playHaptic();
        setShowBrightnessSlider(!showBrightnessSlider);
        setShowSettings(false);
        setShowChapters(false);
        setShowVolumeSlider(false);
        showControlsTemporarily();
    }, [showBrightnessSlider, showControlsTemporarily]);

    const handleBrightnessChange = useCallback((value: number) => {
        setBrightness(value);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    // Fixed mute toggle
    const toggleMute = useCallback(async () => {
        await playHaptic();
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        
        showControlsTemporarily();
    }, [isMuted, showControlsTemporarily]);

    // Volume slider control
    const toggleVolumeSlider = useCallback(async () => {
        await playHaptic();
        setShowVolumeSlider(!showVolumeSlider);
        setShowSettings(false);
        setShowChapters(false);
        setShowBrightnessSlider(false);
        showControlsTemporarily();
    }, [showVolumeSlider, showControlsTemporarily]);

    // Fixed volume handling
    const handleVolumeChange = useCallback((value: number) => {
        const newVolume = Math.round(value * 100);
        setVolume(newVolume);
        
        // Auto-mute/unmute based on volume
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

    const getCurrentChapter = useCallback(() => {
        return chapters.findLast(chapter => chapter.start <= currentTime);
    }, [chapters, currentTime]);

    const changePlaybackSpeed = useCallback(async (speed: number) => {
        await playHaptic();
        setPlaybackSpeed(speed);
        
        if (playerRef.current) {
            playerRef.current.setPlaybackRate(speed);
        }
        
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const changeResizeMode = useCallback(async (mode: PlayerResizeMode) => {
        await playHaptic();
        setResizeMode(mode);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

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
        if (showSettings) {
            setShowSettings(false);
        } else if (showChapters) {
            setShowChapters(false);
        } else if (showVolumeSlider) {
            setShowVolumeSlider(false);
        } else if (showBrightnessSlider) {
            setShowBrightnessSlider(false);
        } else {
            showControlsTemporarily();
        }
    }, [showSettings, showChapters, showVolumeSlider, showBrightnessSlider, showControlsTemporarily]);

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
            case 'contain': return 'Fit';
            case 'cover': return 'Fill';
            case 'fill': return 'Stretch';
            case 'none': return 'Original';
            default: return 'Fit';
        }
    }, [resizeMode]);

    const currentChapter = getCurrentChapter();
    const displayTime = isDragging ? dragPosition * duration : currentTime;
    const sliderValue = isDragging ? dragPosition : (duration > 0 ? currentTime / duration : 0);

    // Calculate volume for display
    const displayVolume = isMuted ? 0 : volume / 100;

    return (
        <View style={styles.container}>
            {!error && (
                <VLCPlayer
                    ref={playerRef}
                    style={[
                        styles.video,
                        { opacity: brightness }
                    ]}
                    source={{ uri: videoUrl }}
                    autoplay={autoPlay}
                    autoAspectRatio={false}
                    resizeMode={resizeMode}
                    volume={isMuted ? 0 : volume}
                    paused={!autoPlay}                    
                    //onOpen={onOpen}
                    onLoad={onLoadStart}
                    onProgress={onProgress}
                    onBuffering={onBuffering}
                    onPlaying={onPlaying}
                    onPaused={onPaused}
                    onStopped={onStopped}
                    onError={onError}
                />
            )}

            {error && (
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={64} color="#ff6b6b" />
                    <Text style={styles.errorTitle}>Playback Error</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => {
                        setError(null);
                        setIsReady(false);
                        setIsBuffering(true);
                    }}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {artwork && isBuffering && !error && (
                <View style={styles.artworkContainer}>
                    <Image
                        source={{ uri: artwork }}
                        style={styles.artworkImage}
                        resizeMode="cover"
                    />
                    <View style={styles.artworkOverlay} />
                </View>
            )}

            {/* Loading indicator */}
            {isBuffering && !error && (
                <Animated.View
                    style={[
                        styles.bufferingContainer,
                        { opacity: bufferOpacity }
                    ]}
                    pointerEvents="none"
                >
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.bufferingText}>Loading...</Text>
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
                            {subtitle && (
                                <Text style={styles.subtitleText} numberOfLines={1}>
                                    {subtitle}
                                </Text>
                            )}
                            {currentChapter && (
                                <Text style={styles.chapterText} numberOfLines={1}>
                                    {currentChapter.title}
                                </Text>
                            )}
                        </View>

                        <View style={styles.topRightControls}>
                            {/* Mute button with proper state indication */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={toggleMute}
                            >
                                <Ionicons
                                    name={isMuted || displayVolume === 0 ? "volume-mute" : displayVolume < 0.5 ? "volume-low" : "volume-high"}
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

                            {chapters.length > 0 && (
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={async () => {
                                        await playHaptic();
                                        setShowChapters(!showChapters);
                                        setShowSettings(false);
                                        setShowVolumeSlider(false);
                                        setShowBrightnessSlider(false);
                                    }}
                                >
                                    <MaterialIcons name="list" size={24} color="white" />
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={async () => {
                                    await playHaptic();
                                    setShowSettings(!showSettings);
                                    setShowChapters(false);
                                    setShowVolumeSlider(false);
                                    setShowBrightnessSlider(false);
                                }}
                            >
                                <Ionicons name="settings-outline" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* Center controls - Hidden during buffering */}
                    {!isBuffering && (
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

                        {/* Fixed progress bar with proper slider */}
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
                </Animated.View>
            )}

            {/* Volume slider */}
            {showVolumeSlider && (
                <TouchableOpacity
                    style={styles.volumeOverlay}
                    activeOpacity={1}
                    onPress={() => setShowVolumeSlider(false)}
                >
                    <TouchableOpacity
                        style={styles.volumePanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.volumeControls}>
                            <Ionicons name="volume-low" size={20} color="white" />
                            <Slider
                                style={styles.volumeSlider}
                                minimumValue={0}
                                maximumValue={1}
                                value={displayVolume}
                                onValueChange={handleVolumeChange}
                                minimumTrackTintColor="#007AFF"
                                maximumTrackTintColor="rgba(255,255,255,0.3)"
                            />
                            <Ionicons name="volume-high" size={20} color="white" />
                            <Text style={styles.volumePercentage}>{Math.round(displayVolume * 100)}%</Text>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {showBrightnessSlider && (
                <TouchableOpacity
                    style={styles.brightnessOverlay}
                    activeOpacity={1}
                    onPress={() => setShowBrightnessSlider(false)}
                >
                    <TouchableOpacity
                        style={styles.brightnessPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.brightnessControls}>
                            <Ionicons name="sunny-outline" size={20} color="white" />
                            <Slider
                                style={styles.brightnessSlider}
                                minimumValue={0.2}
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

            {/* Settings panel */}
            {showSettings && (
                <TouchableOpacity
                    style={styles.settingsOverlay}
                    activeOpacity={1}
                    onPress={() => setShowSettings(false)}
                >
                    <TouchableOpacity
                        style={styles.settingsPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <ScrollView style={styles.settingsContent}>
                            <Text style={styles.settingsTitle}>Video Scale</Text>
                            <View style={styles.scaleOptions}>
                                {[
                                    { value: 'contain', label: 'Fit' },
                                    { value: 'cover', label: 'Fill' },
                                    { value: 'stretch', label: 'Stretch' },
                                    { value: 'none', label: 'Original' }
                                ].map(option => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.scaleOption,
                                            resizeMode === option.value && styles.scaleOptionSelected
                                        ]}
                                        onPress={async () => { await playHaptic(); changeResizeMode(option.value as PlayerResizeMode); }}
                                    >
                                        <Text style={[
                                            styles.scaleOptionText,
                                            resizeMode === option.value && styles.scaleOptionTextSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.settingsTitle}>Playback Speed</Text>
                            <View style={styles.speedOptions}>
                                {[0.5, 0.75, 0.8, 0.9, 1.0, 1.1, 1.2, 1.25, 1.5, 2.0].map(speed => (
                                    <TouchableOpacity
                                        key={speed}
                                        style={[
                                            styles.speedOption,
                                            playbackSpeed === speed && styles.speedOptionSelected
                                        ]}
                                        onPress={async () => { await playHaptic(); changePlaybackSpeed(speed); }}
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

                            {subtitles.length > 0 && (
                                <>
                                    <Text style={styles.settingsTitle}>Subtitles</Text>
                                    <View style={styles.subtitleOptions}>
                                        <TouchableOpacity
                                            style={[
                                                styles.subtitleOption,
                                                selectedSubtitle === -1 && styles.subtitleOptionSelected
                                            ]}
                                            onPress={async () => { await playHaptic(); setSelectedSubtitle(-1); }}
                                        >
                                            <Text style={styles.subtitleOptionText}>Off</Text>
                                        </TouchableOpacity>
                                        {subtitles.map((sub, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.subtitleOption,
                                                    selectedSubtitle === index && styles.subtitleOptionSelected
                                                ]}
                                                onPress={async () => { await playHaptic(); setSelectedSubtitle(index); }}
                                            >
                                                <Text style={styles.subtitleOptionText}>
                                                    {sub.label || sub.language}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}

                            {audioTracks.length > 0 && (
                                <>
                                    <Text style={styles.settingsTitle}>Audio Track</Text>
                                    <View style={styles.audioOptions}>
                                        {audioTracks.map((track, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.audioOption,
                                                    selectedAudioTrack === index && styles.audioOptionSelected
                                                ]}
                                                onPress={async () => { await playHaptic(); setSelectedAudioTrack(index); }}
                                            >
                                                <Text style={styles.audioOptionText}>
                                                    {track.label || track.language || `Track ${index + 1}`}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Chapters panel */}
            {showChapters && chapters.length > 0 && (
                <TouchableOpacity
                    style={styles.chaptersOverlay}
                    activeOpacity={1}
                    onPress={() => setShowChapters(false)}
                >
                    <TouchableOpacity
                        style={styles.chaptersPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <ScrollView style={styles.chaptersContent}>
                            <Text style={styles.chaptersTitle}>Chapters</Text>
                            {chapters.map((chapter, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.chapterItem,
                                        currentChapter?.title === chapter.title && styles.chapterItemActive
                                    ]}
                                    onPress={async () => {
                                        await playHaptic();
                                        seekTo(chapter.start);
                                        setShowChapters(false);
                                    }}
                                >
                                    {chapter.thumbnail && (
                                        <Image
                                            source={{ uri: chapter.thumbnail }}
                                            style={styles.chapterThumbnail}
                                            resizeMode="cover"
                                        />
                                    )}
                                    <View style={styles.chapterInfo}>
                                        <Text style={styles.chapterTitle}>{chapter.title}</Text>
                                        <Text style={styles.chapterTime}>{formatTime(chapter.start)}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
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
    subtitleText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        marginTop: 2,
    },
    chapterText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        marginTop: 4,
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
    bottomRightControls: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    timeText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
        marginHorizontal: 10
    },
    volumeText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '500',
        marginRight: 12,
    },
    speedText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 12,
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
    volumeOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    volumePanel: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 12,
        padding: 20,
        minWidth: 320,
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
        fontSize: 14,
        fontWeight: '500',
        minWidth: 40,
        textAlign: 'center',
        marginLeft: 10,
    },
    brightnessOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    brightnessPanel: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 12,
        padding: 20,
        minWidth: 320,
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
        fontSize: 14,
        fontWeight: '500',
        minWidth: 40,
        textAlign: 'center',
        marginLeft: 10,
    },
    settingsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsPanel: {
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        borderRadius: 12,
        padding: 20,
        minWidth: 280,
        maxWidth: '80%',
        maxHeight: '70%',
    },
    settingsContent: {
        maxHeight: 400,
    },
    settingsTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 20,
    },
    speedOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    speedOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        margin: 4,
    },
    speedOptionSelected: {
        backgroundColor: '#007AFF',
    },
    speedOptionText: {
        color: 'white',
        fontSize: 14,
    },
    speedOptionTextSelected: {
        fontWeight: '600',
    },
    scaleOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    scaleOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        margin: 4,
    },
    scaleOptionSelected: {
        backgroundColor: '#007AFF',
    },
    scaleOptionText: {
        color: 'white',
        fontSize: 14,
    },
    scaleOptionTextSelected: {
        fontWeight: '600',
    },
    subtitleOptions: {
        marginBottom: 10,
    },
    subtitleOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 6,
        marginBottom: 8,
    },
    subtitleOptionSelected: {
        backgroundColor: '#007AFF',
    },
    subtitleOptionText: {
        color: 'white',
        fontSize: 14,
    },
    audioOptions: {
        marginBottom: 10,
    },
    audioOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 6,
        marginBottom: 8,
    },
    audioOptionSelected: {
        backgroundColor: '#007AFF',
    },
    audioOptionText: {
        color: 'white',
        fontSize: 14,
    },
    chaptersOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chaptersPanel: {
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        borderRadius: 12,
        padding: 20,
        minWidth: 320,
        maxWidth: '85%',
        maxHeight: '70%',
    },
    chaptersContent: {
        maxHeight: 400,
    },
    chaptersTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    chapterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        marginBottom: 8,
        padding: 12,
    },
    chapterItemActive: {
        backgroundColor: 'rgba(0, 122, 255, 0.3)',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    chapterThumbnail: {
        width: 60,
        height: 34,
        borderRadius: 4,
        marginRight: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    chapterInfo: {
        flex: 1,
    },
    chapterTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    chapterTime: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
    },
});