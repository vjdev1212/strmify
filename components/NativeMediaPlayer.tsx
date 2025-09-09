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
import Video, { VideoRef, ResizeMode, OnLoadData, OnProgressData, OnBufferData, SelectedTrackType } from 'react-native-video';
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
    const videoRef = useRef<VideoRef>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<string | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [volume, setVolume] = useState(0.0);
    const [isMuted, setIsMuted] = useState(true);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showChapters, setShowChapters] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [resizeMode, setResizeMode] = useState<ResizeMode>(ResizeMode.CONTAIN);
    const [showResizeModeLabel, setShowResizeModeLabel] = useState(false);
    const [brightness, setBrightness] = useState(1.0);
    const [showBrightnessSlider, setShowBrightnessSlider] = useState(false);
    const [availableTextTracks, setAvailableTextTracks] = useState<any[]>([]);
    const [availableAudioTracks, setAvailableAudioTracks] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    // All resize mode options available in react-native-video
    const resizeModeOptions: ResizeMode[] = [
        ResizeMode.NONE, 
        ResizeMode.CONTAIN, 
        ResizeMode.COVER, 
        ResizeMode.STRETCH
    ];

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

    const onLoad = useCallback((data: OnLoadData) => {
        setIsBuffering(false);
        setIsReady(true);
        setDuration(data.duration);
        setError(null); // Clear any previous errors

        // Set available tracks
        if (data.textTracks) {
            setAvailableTextTracks(data.textTracks);
        }
        if (data.audioTracks) {
            setAvailableAudioTracks(data.audioTracks);
        }

        Animated.timing(bufferOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [bufferOpacity]);

    const onProgress = useCallback((data: OnProgressData) => {
        if (isDragging) return;

        setCurrentTime(data.currentTime);

        if (duration > 0) {
            const progress = data.currentTime / duration;
            progressBarValue.setValue(progress);
        }
    }, [isDragging, duration]);

    const onBuffer = useCallback((data: OnBufferData) => {
        if (data.isBuffering && isReady) {
            setIsBuffering(true);
            Animated.timing(bufferOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        } else if (!data.isBuffering) {
            setIsBuffering(false);
            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [bufferOpacity, isReady]);

    const onPlaybackStateChanged = useCallback((data: any) => {
        setIsPlaying(data.isPlaying);
    }, []);

    const onError = useCallback((error: any) => {
        console.log('Video error:', error);
        let errorMessage = "Failed to load video.";
        
        if (error?.error) {
            if (error.error.code) {
                errorMessage += ` Error code: ${error.error.code}`;
            }
            if (error.error.localizedDescription) {
                errorMessage += ` - ${error.error.localizedDescription}`;
            } else if (error.error.message) {
                errorMessage += ` - ${error.error.message}`;
            }
        }
        
        // Check for .mkv file format issue
        if (videoUrl.toLowerCase().includes('.mkv')) {
            errorMessage += " MKV files may not be supported on all devices. Try converting to MP4 format.";
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
        if (!isReady) return;

        await playHaptic();
        setIsPlaying(!isPlaying);
        showControlsTemporarily();
    }, [isPlaying, isReady, showControlsTemporarily]);

    const cycleResizeMode = useCallback(async () => {
        await playHaptic();
        const currentIndex = resizeModeOptions.indexOf(resizeMode);
        const nextIndex = (currentIndex + 1) % resizeModeOptions.length;
        setResizeMode(resizeModeOptions[nextIndex]);

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
        if (!isReady || duration <= 0 || !videoRef.current) return;

        const clampedTime = Math.max(0, Math.min(duration, seconds));
        videoRef.current.seek(clampedTime);
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
        
        // If unmuting and volume is 0, set to a reasonable level
        if (!newMutedState && volume === 0) {
            setVolume(0.7);
        }
        
        showControlsTemporarily();
    }, [isMuted, volume, showControlsTemporarily]);

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
        setVolume(value);
        
        // Auto-mute/unmute based on volume
        if (value === 0) {
            setIsMuted(true);
        } else if (isMuted && value > 0) {
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
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const changeResizeMode = useCallback(async (mode: ResizeMode) => {
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
            case ResizeMode.CONTAIN: return 'fit-screen';
            case ResizeMode.COVER: return 'crop';
            case ResizeMode.STRETCH: return 'fullscreen';
            case ResizeMode.NONE: return 'aspect-ratio';
            default: return 'fit-screen';
        }
    }, [resizeMode]);

    const getResizeModeLabel = useCallback(() => {
        switch (resizeMode) {
            case ResizeMode.CONTAIN: return 'Fit';
            case ResizeMode.COVER: return 'Fill';
            case ResizeMode.STRETCH: return 'Stretch';
            case ResizeMode.NONE: return 'Original';
            default: return 'Fit';
        }
    }, [resizeMode]);

    const currentChapter = getCurrentChapter();
    const displayTime = isDragging ? dragPosition * duration : currentTime;
    const sliderValue = isDragging ? dragPosition : (duration > 0 ? currentTime / duration : 0);

    // Calculate actual volume to pass to video player
    const actualVolume = isMuted ? 0 : volume;

    return (
        <View style={styles.container}>
            {!error && (
                <Video
                    ref={videoRef}
                    style={[
                        styles.video,
                        { opacity: brightness }
                    ]}
                    source={{ uri: videoUrl }}
                    resizeMode={resizeMode}
                    paused={!isPlaying}
                    volume={actualVolume} // Use calculated volume
                    rate={playbackSpeed}
                    onLoad={onLoad}
                    onProgress={onProgress}
                    onBuffer={onBuffer}
                    onPlaybackStateChanged={onPlaybackStateChanged}
                    onError={onError}
                    selectedTextTrack={selectedSubtitle ? { type: SelectedTrackType.LANGUAGE, value: selectedSubtitle } : { type: SelectedTrackType.DISABLED }}
                    selectedAudioTrack={selectedAudioTrack ? { type: SelectedTrackType.INDEX, value: parseInt(selectedAudioTrack) } : { type: SelectedTrackType.INDEX }}
                    bufferConfig={{
                        minBufferMs: 15000,
                        maxBufferMs: 50000,
                        bufferForPlaybackMs: 2500,
                        bufferForPlaybackAfterRebufferMs: 5000
                    }}
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
                                    name={isMuted || actualVolume === 0 ? "volume-mute" : actualVolume < 0.5 ? "volume-low" : "volume-high"}
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

                        {/* Show current volume and speed */}
                        <View style={styles.bottomRightControls}>
                            {!isMuted && actualVolume > 0 && (
                                <Text style={styles.volumeText}>
                                    {Math.round(actualVolume * 100)}%
                                </Text>
                            )}
                            {playbackSpeed !== 1.0 && (
                                <Text style={styles.speedText}>
                                    {playbackSpeed}x
                                </Text>
                            )}
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
                                value={volume}
                                onValueChange={handleVolumeChange}
                                minimumTrackTintColor="#007AFF"
                                maximumTrackTintColor="rgba(255,255,255,0.3)"
                            />
                            <Ionicons name="volume-high" size={20} color="white" />
                            <Text style={styles.volumePercentage}>{Math.round(volume * 100)}%</Text>
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
                                    { value: ResizeMode.CONTAIN, label: 'Fit' },
                                    { value: ResizeMode.COVER, label: 'Fill' },
                                    { value: ResizeMode.STRETCH, label: 'Stretch' },
                                    { value: ResizeMode.NONE, label: 'Original' }
                                ].map(option => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.scaleOption,
                                            resizeMode === option.value && styles.scaleOptionSelected
                                        ]}
                                        onPress={async () => { await playHaptic(); changeResizeMode(option.value); }}
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

                            {availableTextTracks.length > 0 && (
                                <>
                                    <Text style={styles.settingsTitle}>Subtitles</Text>
                                    <View style={styles.subtitleOptions}>
                                        <TouchableOpacity
                                            style={[
                                                styles.subtitleOption,
                                                selectedSubtitle === null && styles.subtitleOptionSelected
                                            ]}
                                            onPress={async () => { await playHaptic(); setSelectedSubtitle(null); }}
                                        >
                                            <Text style={styles.subtitleOptionText}>Off</Text>
                                        </TouchableOpacity>
                                        {availableTextTracks.map((sub, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.subtitleOption,
                                                    selectedSubtitle === sub.language && styles.subtitleOptionSelected
                                                ]}
                                                onPress={async () => { await playHaptic(); setSelectedSubtitle(sub.language); }}
                                            >
                                                <Text style={styles.subtitleOptionText}>
                                                    {sub.title || sub.language}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}

                            {availableAudioTracks.length > 0 && (
                                <>
                                    <Text style={styles.settingsTitle}>Audio Track</Text>
                                    <View style={styles.audioOptions}>
                                        {availableAudioTracks.map((track, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.audioOption,
                                                    selectedAudioTrack === index.toString() && styles.audioOptionSelected
                                                ]}
                                                onPress={async () => { await playHaptic(); setSelectedAudioTrack(index.toString()); }}
                                            >
                                                <Text style={styles.audioOptionText}>
                                                    {track.title || track.language || `Track ${index + 1}`}
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