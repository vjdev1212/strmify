import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    StatusBar,
    PanResponder,
    ScrollView,
    ActivityIndicator,
    Platform,
    Image,
} from "react-native";
import { useVideoPlayer, VideoContentFit, VideoView } from "expo-video";
import { useEvent } from "expo";
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from '@react-native-community/slider';
import { showAlert } from "@/utils/platform";
import * as Haptics from 'expo-haptics';

export interface Subtitle {
    fileId: string | number | null;
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
    subtitles?: Subtitle[];
    audioTracks?: AudioTrack[];
    onBack: () => void;
    autoPlay?: boolean;
    artwork?: string;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    onBack,
    artwork,
}) => {
    const videoRef = useRef<VideoView>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<string | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [volume, setVolume] = useState(1.0);
    const [isMuted, setIsMuted] = useState(true);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showChapters, setShowChapters] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [contentFit, setContentFit] = useState<VideoContentFit>('fill');
    const [showContentFitLabel, setShowContentFitLabel] = useState(false);
    const [brightness, setBrightness] = useState(1.0);
    const [showBrightnessSlider, setShowBrightnessSlider] = useState(false);


    // Content fit options cycle
    const contentFitOptions: VideoContentFit[] = ['contain', 'cover', 'fill'];

    // Animated values
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const progressBarValue = useRef(new Animated.Value(0)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;
    const contentFitLabelOpacity = useRef(new Animated.Value(0)).current;

    // Auto-hide controls timer
    const hideControlsTimer = useRef<any>(null);
    const contentFitLabelTimer = useRef<any>(null);

    // Initialize player
    const player = useVideoPlayer(videoUrl, (player) => {
        player.loop = false;
        player.muted = isMuted;
        player.volume = volume;
        player.playbackRate = playbackSpeed;
    });

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
            if (contentFitLabelTimer.current) {
                clearTimeout(contentFitLabelTimer.current);
            }
        };
    }, []);

    useEffect(() => {
        if (player) {
            player.muted = isMuted;
            player.volume = isMuted ? 0 : volume;
            player.playbackRate = playbackSpeed;

            if (typeof window !== 'undefined' && window.AudioContext) {
                const audioContext = new (window.AudioContext)();
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
            }
        }
    }, [player, isMuted, volume, playbackSpeed]);

    // Playing state change handler
    const playingChange = useEvent(player, "playingChange");
    useEffect(() => {
        if (!playingChange) return;

        const { isPlaying: playing } = playingChange;
        setIsPlaying(playing);

        if (playing) {
            setIsBuffering(false);
            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [playingChange, bufferOpacity]);

    // Time update handler
    const timeUpdate = useEvent(player, "timeUpdate");
    useEffect(() => {
        if (!timeUpdate || isDragging) return;

        const { currentTime: time } = timeUpdate;
        setCurrentTime(time);

        // Get duration from player
        const videoDuration = player.duration || 0;
        if (videoDuration > 0 && duration !== videoDuration) {
            setDuration(videoDuration);
        }

        // Update progress bar
        if (videoDuration > 0) {
            const progress = time / videoDuration;
            progressBarValue.setValue(progress);
        }
    }, [timeUpdate, player.duration, isDragging, duration]);

    // Status change handler
    const statusChange = useEvent(player, "statusChange");
    useEffect(() => {
        if (!statusChange) return;

        const { status, error } = statusChange;
        if (error) {
            console.log('Video error:', error.message);
        }

        switch (status) {
            case "loading":
                // Only show buffering if not ready yet
                if (!isReady) {
                    setIsBuffering(true);
                    Animated.timing(bufferOpacity, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }).start();
                }
                break;

            case "readyToPlay":
                setIsBuffering(false);
                setIsReady(true);
                // Get duration when ready
                const videoDuration = player.duration || 0;
                if (videoDuration > 0) {
                    setDuration(videoDuration);
                }
                Animated.timing(bufferOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start();

                player.play();
                break;

            case "error":
                showAlert("Video Error", "Failed to load video. Use external media players for better playback.");
                setIsBuffering(false);
                setIsReady(false);
                break;
        }
    }, [statusChange, player, bufferOpacity, isReady]);

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
        if (isPlaying) {
            player.pause();
        } else {
            player.play();
        }
        showControlsTemporarily();
    }, [isPlaying, player, isReady, showControlsTemporarily]);

    const togglePictureInPicture = useCallback(async () => {
        try {
            await playHaptic();
            if (videoRef.current && player && isReady) {
                await videoRef.current.startPictureInPicture();
            }
            showControlsTemporarily();
        } catch (error) {
            console.warn("PiP error:", error);
            showAlert("Picture-in-Picture", "PiP mode is not supported on this device or video is not ready.");
        }
    }, [showControlsTemporarily, player, isReady]);

    const cycleContentFit = useCallback(async () => {
        await playHaptic();
        const currentIndex = contentFitOptions.indexOf(contentFit);
        const nextIndex = (currentIndex + 1) % contentFitOptions.length;
        setContentFit(contentFitOptions[nextIndex]);

        // Show the label briefly
        setShowContentFitLabel(true);
        Animated.timing(contentFitLabelOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();

        if (contentFitLabelTimer.current) {
            clearTimeout(contentFitLabelTimer.current);
        }

        contentFitLabelTimer.current = setTimeout(() => {
            Animated.timing(contentFitLabelOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setShowContentFitLabel(false);
            });
        }, 1000);

        showControlsTemporarily();
    }, [contentFit, showControlsTemporarily]);

    const seekTo = useCallback((seconds: number) => {
        if (!isReady || duration <= 0) return;

        const clampedTime = Math.max(0, Math.min(duration, seconds));
        player.seekBy(clampedTime);
        setCurrentTime(clampedTime);
        showControlsTemporarily();
    }, [duration, player, showControlsTemporarily, isReady]);

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

    // Separate mute toggle
    const toggleMute = useCallback(async () => {
        await playHaptic();
        setIsMuted(!isMuted);
        showControlsTemporarily();
    }, [isMuted, showControlsTemporarily]);

    // Volume slider control
    const toggleVolumeSlider = useCallback(async () => {
        await playHaptic();
        setShowVolumeSlider(!showVolumeSlider);
        setShowSettings(false);
        setShowChapters(false);
        showControlsTemporarily();
    }, [showVolumeSlider, showControlsTemporarily]);

    const handleVolumeChange = useCallback((value: number) => {
        setVolume(value);
        if (value === 0) {
            setIsMuted(true);
        } else if (isMuted) {
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
        await playHaptic();
        setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const changeContentFit = useCallback(async (fit: VideoContentFit) => {
        await playHaptic();
        setContentFit(fit);
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

    const getContentFitIcon = useCallback(() => {
        switch (contentFit) {
            case 'contain': return 'fit-screen';
            case 'cover': return 'crop';
            case 'fill': return 'fullscreen';
            default: return 'fit-screen';
        }
    }, [contentFit]);

    const getContentFitLabel = useCallback(() => {
        switch (contentFit) {
            case 'contain': return 'Fit';
            case 'cover': return 'Fill';
            case 'fill': return 'Stretch';
            default: return 'Fit';
        }
    }, [contentFit]);

    const displayTime = isDragging ? dragPosition * duration : currentTime;
    const sliderValue = isDragging ? dragPosition : (duration > 0 ? currentTime / duration : 0);

    return (
        <View style={styles.container}>
            <VideoView
                ref={videoRef}
                style={[
                    styles.video,
                    { opacity: brightness }
                ]}
                player={player}
                allowsFullscreen={false}
                allowsPictureInPicture={true}
                nativeControls={false}
                contentFit={contentFit}
                crossOrigin="anonymous"
            />

            {artwork && isBuffering && (
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
            {isBuffering && (
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

            {/* Content fit label overlay */}
            {showContentFitLabel && (
                <Animated.View
                    style={[
                        styles.contentFitLabelOverlay,
                        { opacity: contentFitLabelOpacity }
                    ]}
                    pointerEvents="none"
                >
                    <View style={styles.contentFitLabelContainer}>
                        <MaterialIcons
                            name={getContentFitIcon()}
                            size={32}
                            color="white"
                        />
                        <Text style={styles.contentFitLabelText}>
                            {getContentFitLabel()}
                        </Text>
                    </View>
                </Animated.View>
            )}

            {/* Touch area for showing controls */}
            <TouchableOpacity
                style={styles.touchArea}
                activeOpacity={1}
                onPress={handleOverlayPress}
            />

            {/* Controls overlay */}
            {showControls && (
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
                            {/* Separate Mute button */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={toggleMute}
                            >
                                <Ionicons
                                    name={isMuted ? "volume-mute" : "volume-high"}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {/* Volume slider control */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={async () => { await playHaptic(); toggleVolumeSlider(); }}
                            >
                                <MaterialIcons
                                    name="tune"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={async () => { await playHaptic(); toggleBrightnessSlider(); }}
                            >
                                <Ionicons
                                    name="sunny"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {/* Content fit control */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={async () => { await playHaptic(); cycleContentFit(); }}
                            >
                                <MaterialIcons
                                    name={getContentFitIcon()}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={async () => { await playHaptic(); togglePictureInPicture(); }}
                            >
                                <MaterialIcons
                                    name="picture-in-picture-alt"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={async () => {
                                    await playHaptic();
                                    setShowSettings(!showSettings);
                                    setShowChapters(false);
                                    setShowVolumeSlider(false);
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

                        {/* Only show speed when not default */}
                        {playbackSpeed !== 1.0 && (
                            <View style={styles.bottomRightControls}>
                                <Text style={styles.speedText}>
                                    {playbackSpeed}x
                                </Text>
                            </View>
                        )}
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
                                    { value: 'fill', label: 'Stretch' }
                                ].map(option => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.scaleOption,
                                            contentFit === option.value && styles.scaleOptionSelected
                                        ]}
                                        onPress={async () => { await playHaptic(); changeContentFit(option.value as VideoContentFit); }}
                                    >
                                        <Text style={[
                                            styles.scaleOptionText,
                                            contentFit === option.value && styles.scaleOptionTextSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.settingsTitle}>Playback Speed</Text>
                            <View style={styles.speedOptions}>
                                {[0.75, 0.8, 0.9, 1.0, 1.1, 1.2, 1.25].map(speed => (
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

                            {player.availableSubtitleTracks.length > 0 && (
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
                                        {player.availableSubtitleTracks.map(sub => (
                                            <TouchableOpacity
                                                key={sub.language}
                                                style={[
                                                    styles.subtitleOption,
                                                    selectedSubtitle === sub.language && styles.subtitleOptionSelected
                                                ]}
                                                onPress={async () => { await playHaptic(); setSelectedSubtitle(sub.language); }}
                                            >
                                                <Text style={styles.subtitleOptionText}>
                                                    {sub.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}

                            {player.availableAudioTracks.length > 0 && (
                                <>
                                    <Text style={styles.settingsTitle}>Audio Track</Text>
                                    <View style={styles.audioOptions}>
                                        {player.availableAudioTracks.map(track => (
                                            <TouchableOpacity
                                                key={track.id}
                                                style={[
                                                    styles.audioOption,
                                                    selectedAudioTrack === track.id && styles.audioOptionSelected
                                                ]}
                                                onPress={async () => { await playHaptic(); setSelectedAudioTrack(track.id); }}                                            >
                                                <Text style={styles.audioOptionText}>
                                                    {track.label}
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
    contentFitLabelOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -75 }, { translateY: -50 }],
        zIndex: 5,
    },
    contentFitLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    contentFitLabelText: {
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
        minWidth: 300,
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
    sliderThumb: {
        backgroundColor: '#007AFF',
        width: 20,
        height: 20,
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
        minWidth: 300,
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
});