import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Platform,
    Image,
} from "react-native";
import Video, { ResizeMode } from 'react-native-video';
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from '@react-native-assets/slider';
import { showAlert } from "@/utils/platform";
import { styles } from "./styles";
import { playHaptic } from "./utils";
import { MediaPlayerProps } from "./models";

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    subtitles = [],
    onBack,
    artwork,
}) => {
    const videoRef = useRef<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [resizeMode, setResizeMode] = useState<ResizeMode>(ResizeMode.CONTAIN);

    // Animated values
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;

    // Auto-hide controls timer
    const hideControlsTimer = useRef<any>(null);

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
        };
    }, []);

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
            if (isPlaying && !showSettings) {
                Animated.timing(controlsOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => {
                    setShowControls(false);
                });
            }
        }, 3000);
    }, [isPlaying, controlsOpacity, showSettings]);


    // Video event handlers
    const onLoad = useCallback((data: any) => {
        setDuration(data.duration);
        setIsReady(true);
        setIsBuffering(false);
        Animated.timing(bufferOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [bufferOpacity]);

    const onProgress = useCallback((data: any) => {
        if (!isDragging) {
            setCurrentTime(data.currentTime);
        }
    }, [isDragging]);

    const onBuffer = useCallback(({ isBuffering: buffering }: { isBuffering: boolean }) => {
        if (isReady) {
            setIsBuffering(buffering);
            Animated.timing(bufferOpacity, {
                toValue: buffering ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [bufferOpacity, isReady]);

    const onError = useCallback((error: any) => {
        console.log('Video error:', error);
        showAlert("Video Error", "Failed to load video. Please try again or use an external media player.");
        setIsBuffering(false);
        setIsReady(false);
    }, []);

    const onEnd = useCallback(() => {
        setIsPlaying(false);
        videoRef.current?.seek(0);
    }, []);

    // Control functions
    const togglePlayPause = useCallback(async () => {
        if (!isReady) return;
        await playHaptic();
        setIsPlaying(!isPlaying);
        showControlsTemporarily();
    }, [isPlaying, isReady, showControlsTemporarily]);

    const cycleResizeMode = useCallback(async () => {
        await playHaptic();
        const modes: ResizeMode[] = ['contain' as ResizeMode, 'cover' as ResizeMode, 'stretch' as ResizeMode];
        const currentIndex = modes.indexOf(resizeMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        setResizeMode(modes[nextIndex]);
        showControlsTemporarily();
    }, [resizeMode, showControlsTemporarily]);

    const seekTo = useCallback((seconds: number) => {
        if (!isReady || duration <= 0) return;
        const clampedTime = Math.max(0, Math.min(duration, seconds));
        videoRef.current?.seek(clampedTime);
        setCurrentTime(clampedTime);
        showControlsTemporarily();
    }, [duration, isReady, showControlsTemporarily]);

    const skipTime = useCallback(async (seconds: number) => {
        if (!isReady || duration <= 0) return;
        await playHaptic();
        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        seekTo(newTime);
    }, [currentTime, duration, seekTo, isReady]);

    const toggleMute = useCallback(async () => {
        await playHaptic();
        setIsMuted(!isMuted);
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

    const changeResizeMode = useCallback(async (mode: ResizeMode) => {
        await playHaptic();
        setResizeMode(mode);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleSliderValueChange = useCallback((value: number) => {
        if (!isReady || duration <= 0) return;
        setIsDragging(true);
        setDragPosition(value);
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

    const handleOverlayPress = useCallback(() => {
        if (showSettings) {
            setShowSettings(false);
        } else {
            showControlsTemporarily();
        }
    }, [showSettings, showControlsTemporarily]);

    const getResizeModeIcon = useCallback(() => {
        switch (resizeMode) {
            case 'contain': return 'fit-screen';
            case 'cover': return 'crop';
            case 'stretch': return 'fullscreen';
            default: return 'fit-screen';
        }
    }, [resizeMode]);

    const getResizeModeLabel = useCallback(() => {
        switch (resizeMode) {
            case 'contain': return 'Fit';
            case 'cover': return 'Fill';
            case 'stretch': return 'Stretch';
            default: return 'Fit';
        }
    }, [resizeMode]);

    const displayTime = isDragging ? dragPosition * duration : currentTime;
    const sliderValue = isDragging ? dragPosition : (duration > 0 ? currentTime / duration : 0);

    return (
        <View style={styles.container}>
            <View style={styles.videoWrapper}>
                <Video
                    ref={videoRef}
                    source={{ uri: videoUrl }}
                    style={styles.video}
                    resizeMode={resizeMode}
                    paused={!isPlaying}
                    muted={isMuted}
                    rate={playbackSpeed}
                    onLoad={onLoad}
                    onProgress={onProgress}
                    onBuffer={onBuffer}
                    onError={onError}
                    onEnd={onEnd}
                    repeat={false}
                    playInBackground={false}
                    playWhenInactive={false}
                    ignoreSilentSwitch="ignore"
                    mixWithOthers="mix"
                />
            </View>

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
                    <View style={styles.topControls}
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

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={async () => {
                                    await playHaptic();
                                    setShowSettings(!showSettings);
                                }}
                            >
                                <Ionicons name="settings-outline" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Center controls */}
                    {!isBuffering && (
                        <View style={styles.centerControls}>
                            <TouchableOpacity
                                style={[styles.skipButton, !isReady && styles.disabledButton]}
                                onPress={() => skipTime(-10)}
                                disabled={!isReady}
                            >
                                <View style={styles.skipButtonInner}>
                                    <MaterialIcons
                                        name="replay-10"
                                        size={40}
                                        color={isReady ? "white" : "rgba(255,255,255,0.5)"}
                                    />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.playButton, !isReady && styles.disabledButton]}
                                onPress={togglePlayPause}
                                disabled={!isReady}
                            >
                                <View style={styles.playButtonInner}>
                                    <Ionicons
                                        name={isPlaying ? "pause" : "play"}
                                        size={60}
                                        color={isReady ? "white" : "rgba(255,255,255,0.5)"}
                                    />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.skipButton, !isReady && styles.disabledButton]}
                                onPress={() => skipTime(30)}
                                disabled={!isReady}
                            >
                                <View style={styles.skipButtonInner}>
                                    <MaterialIcons
                                        name="forward-30"
                                        size={40}
                                        color={isReady ? "white" : "rgba(255,255,255,0.5)"}
                                    />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Bottom controls */}
                    <View
                        style={styles.bottomControls}
                    >
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
                                maximumTrackTintColor="rgba(255,255,255,0.4)"
                                thumbTintColor={'#fff'}
                                thumbSize={25}
                                trackHeight={6}
                                enabled={isReady && duration > 0}
                            />
                        </View>

                        <View style={styles.timeContainer}>
                            <Text style={styles.timeText}>
                                {formatTime(displayTime)}
                            </Text>
                            <View style={styles.rightTimeControls}>
                                {playbackSpeed !== 1.0 && (
                                    <Text style={styles.speedText}>
                                        {playbackSpeed}x
                                    </Text>
                                )}
                                <Text style={styles.timeText}>
                                    {formatTime(duration)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>
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
                            <Text style={styles.settingsTitle}>Playback Speed</Text>
                            <View style={styles.optionGroup}>
                                {[0.75, 0.8, 0.9, 1.0, 1.1, 1.2, 1.25].map(speed => (
                                    <TouchableOpacity
                                        key={`speed-${speed}`}
                                        style={[
                                            styles.option,
                                            playbackSpeed === speed && styles.optionSelected
                                        ]}
                                        onPress={() => changePlaybackSpeed(speed)}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            playbackSpeed === speed && styles.optionTextSelected
                                        ]}>
                                            {speed}x
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {subtitles.length > 0 && (
                                <>
                                    <Text style={styles.settingsTitle}>Subtitles</Text>
                                    <View style={styles.subtitleOptionsGroup}>
                                        <TouchableOpacity
                                            style={[
                                                styles.subtitleOption,
                                                selectedSubtitle === null && styles.subtitleOptionSelected
                                            ]}
                                            onPress={async () => { await playHaptic(); setSelectedSubtitle(null); }}
                                        >
                                            <Text style={[
                                                styles.subtitleOptionText,
                                                selectedSubtitle === null && styles.subtitleOptionTextSelected
                                            ]}>
                                                Off
                                            </Text>
                                        </TouchableOpacity>
                                        {subtitles.map((sub, index) => (
                                            <TouchableOpacity
                                                key={`${index}-${sub.language}`}
                                                style={[
                                                    styles.subtitleOption,
                                                    selectedSubtitle === sub.language && styles.subtitleOptionSelected
                                                ]}
                                                onPress={async () => { await playHaptic(); setSelectedSubtitle(sub.language); }}
                                            >
                                                <Text style={[
                                                    styles.subtitleOptionText,
                                                    selectedSubtitle === sub.language && styles.subtitleOptionTextSelected
                                                ]}>
                                                    {sub.label}
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

