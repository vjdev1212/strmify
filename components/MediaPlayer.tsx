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
} from "react-native";
import Video, { VideoRef, OnLoadData, OnProgressData, SelectedTrackType } from 'react-native-video';
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from '@react-native-assets/slider';
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

interface MediaPlayerProps {
    videoUrl: string;
    title: string;
    subtitles?: Subtitle[];
    audioTracks?: AudioTrack[];
    onBack: () => void;
    autoPlay?: boolean;
    artwork?: string;
}

type ResizeMode = 'contain' | 'cover' | 'stretch';

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    subtitles = [],
    onBack,
    artwork,
}) => {
    const videoRef = useRef<VideoRef>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [volume, setVolume] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [resizeMode, setResizeMode] = useState<ResizeMode>('contain');
    const [showResizeModeLabel, setShowResizeModeLabel] = useState(false);
    const [brightness, setBrightness] = useState(1.0);
    const [showBrightnessSlider, setShowBrightnessSlider] = useState(false);

    // Resize mode options cycle
    const resizeModeOptions: ResizeMode[] = ['contain', 'cover', 'stretch'];

    // Animated values
    const controlsOpacity = useRef(new Animated.Value(1)).current;
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
            if (isPlaying && !showSettings && !showVolumeSlider && !showBrightnessSlider) {
                Animated.timing(controlsOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => {
                    setShowControls(false);
                });
            }
        }, 3000);
    }, [isPlaying, controlsOpacity, showSettings, showVolumeSlider, showBrightnessSlider]);

    const playHaptic = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
            console.log('Haptics not supported');
        }
    }

    // Video event handlers
    const onLoad = useCallback((data: OnLoadData) => {
        setDuration(data.duration);
        setIsReady(true);
        setIsBuffering(false);
        Animated.timing(bufferOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [bufferOpacity]);

    const onProgress = useCallback((data: OnProgressData) => {
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

    const toggleBrightnessSlider = useCallback(async () => {
        await playHaptic();
        setShowBrightnessSlider(!showBrightnessSlider);
        setShowSettings(false);
        setShowVolumeSlider(false);
        showControlsTemporarily();
    }, [showBrightnessSlider, showControlsTemporarily]);

    const handleBrightnessChange = useCallback((value: number) => {
        setBrightness(value);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const toggleMute = useCallback(async () => {
        await playHaptic();
        setIsMuted(!isMuted);
        showControlsTemporarily();
    }, [isMuted, showControlsTemporarily]);

    const toggleVolumeSlider = useCallback(async () => {
        await playHaptic();
        setShowVolumeSlider(!showVolumeSlider);
        setShowSettings(false);
        setShowBrightnessSlider(false);
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
        } else if (showVolumeSlider) {
            setShowVolumeSlider(false);
        } else if (showBrightnessSlider) {
            setShowBrightnessSlider(false);
        } else {
            showControlsTemporarily();
        }
    }, [showSettings, showVolumeSlider, showBrightnessSlider, showControlsTemporarily]);

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

    // Get selected subtitle track
    const selectedSubtitleTrack = subtitles.find(sub => sub.language === selectedSubtitle);

    return (
        <View style={styles.container}>
            <View style={[styles.videoWrapper, { opacity: brightness }]}>
                <Video
                    ref={videoRef}
                    source={{ uri: videoUrl }}
                    style={styles.video}
                    resizeMode={resizeMode}
                    paused={!isPlaying}
                    volume={isMuted ? 0 : volume}
                    rate={playbackSpeed}
                    onLoad={onLoad}
                    onProgress={onProgress}
                    onBuffer={onBuffer}
                    onError={onError}
                    onEnd={onEnd}
                    repeat={false}
                    playInBackground={false}
                    playWhenInactive={false}                                    
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

            {/* Resize mode label overlay */}
            {/* {showResizeModeLabel && (
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
            )} */}

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
                        colors={['rgba(26,26,26,0.95)', 'transparent']}
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
                                    setShowVolumeSlider(false);
                                    setShowBrightnessSlider(false);
                                }}
                            >
                                <Ionicons name="settings-outline" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* Center controls */}
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
                        colors={['transparent', 'rgba(26,26,26,0.95)']}
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

                        <View style={styles.progressContainerWithMargin}>
                            <Slider
                                style={styles.progressSlider}
                                minimumValue={0}
                                maximumValue={1}
                                value={sliderValue}
                                onValueChange={handleSliderValueChange}
                                onSlidingStart={handleSliderSlidingStart}
                                onSlidingComplete={handleSliderSlidingComplete}
                                minimumTrackTintColor="#535aff"
                                maximumTrackTintColor="rgba(255,255,255,0.3)"
                                thumbTintColor={'#fff'}
                                thumbSize={20}
                                trackHeight={5}
                                enabled={isReady && duration > 0}
                            />
                        </View>

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
                                minimumTrackTintColor="#535aff"
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
                                minimumTrackTintColor="#535aff"
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
                                    { value: 'stretch', label: 'Stretch' }
                                ].map(option => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.scaleOption,
                                            resizeMode === option.value && styles.scaleOptionSelected
                                        ]}
                                        onPress={() => changeResizeMode(option.value as ResizeMode)}
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
                                {[0.75, 0.8, 0.9, 1.0, 1.1, 1.2, 1.25].map(speed => (
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

                            {subtitles.length > 0 && (
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
                                        {subtitles.map(sub => (
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
        backgroundColor: '#1a1a1a',
    },
    videoWrapper: {
        width: '100%',
        height: '100%',
    },
    video: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
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