import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    StatusBar,
    Alert,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { VLCPlayer, PlayerResizeMode } from 'react-native-vlc-media-player';
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
    start: number; // in seconds
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
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    subtitle,
    subtitles = [],
    audioTracks = [],
    chapters = [],
    onBack,
    autoPlay = true,
}) => {
    const vlcPlayerRef = useRef<VLCPlayer>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<string | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showChapters, setShowChapters] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [resizeMode, setResizeMode] = useState<PlayerResizeMode>('contain');
    const [showContentFitLabel, setShowContentFitLabel] = useState(false);

    // Content fit options cycle
    const contentFitOptions: PlayerResizeMode[] = ['contain', 'cover', 'fill'];

    // Animated values
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const progressBarValue = useRef(new Animated.Value(0)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;
    const contentFitLabelOpacity = useRef(new Animated.Value(0)).current;

    // Auto-hide controls timer
    const hideControlsTimer = useRef<any>(null);
    const contentFitLabelTimer = useRef<any>(null);

    useEffect(() => {
        const setupOrientation = async () => {
            try {
                await ScreenOrientation.lockAsync(
                    ScreenOrientation.OrientationLock.LANDSCAPE
                );
                StatusBar.setHidden(true);
            } catch (error) {
                console.warn("Failed to set orientation:", error);
            }
        };
        setupOrientation();

        return () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            StatusBar.setHidden(false);
            if (hideControlsTimer.current) {
                clearTimeout(hideControlsTimer.current);
            }
            if (contentFitLabelTimer.current) {
                clearTimeout(contentFitLabelTimer.current);
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
            if (isPlaying && !showSettings && !showChapters && !showVolumeSlider) {
                Animated.timing(controlsOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => {
                    setShowControls(false);
                });
            }
        }, 3000);
    }, [isPlaying, controlsOpacity, showSettings, showChapters, showVolumeSlider]);

    // VLC Player event handlers
    const onProgress = useCallback((data: any) => {
        if (!isDragging && data) {
            const { currentTime: time, duration: dur } = data;
            setCurrentTime(time / 1000); // VLC returns time in milliseconds
            
            if (dur > 0 && duration !== dur / 1000) {
                setDuration(dur / 1000);
            }

            // Update progress bar
            if (dur > 0) {
                const progress = time / dur;
                progressBarValue.setValue(progress);
            }
        }
    }, [isDragging, duration, progressBarValue]);

    const onPlaying = useCallback(() => {
        setIsPlaying(true);
        setIsBuffering(false);
        setIsReady(true);
        
        Animated.timing(bufferOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [bufferOpacity]);

    const onPaused = useCallback(() => {
        setIsPlaying(false);
    }, []);

    const onBuffering = useCallback(() => {
        setIsBuffering(true);
        Animated.timing(bufferOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [bufferOpacity]);

    const onError = useCallback((error: any) => {
        console.error('VLC Player Error:', error);
        Alert.alert("Video Error", "Failed to load video. Please check the video URL and try again.");
        setIsBuffering(false);
        setIsReady(false);
    }, []);

    const onEnd = useCallback(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        progressBarValue.setValue(0);
    }, [progressBarValue]);

    const onLoad = useCallback((data: any) => {
        if (data && data.duration) {
            setDuration(data.duration / 1000); // Convert from milliseconds
            setIsReady(true);
            setIsBuffering(false);
            
            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [bufferOpacity]);

    // Control functions
    const togglePlayPause = useCallback(() => {
        if (!isReady) return;

        if (vlcPlayerRef.current) {
            // if (isPlaying) {
            //     vlcPlayerRef.current.pause(true);
            // } else {
            //     vlcPlayerRef.current.resume(true);
            // }
        }
        showControlsTemporarily();
    }, [isPlaying, isReady, showControlsTemporarily]);

    const togglePictureInPicture = useCallback(async () => {
        try {
            Alert.alert("Picture-in-Picture", "Picture-in-Picture is not available with VLC player.");
            showControlsTemporarily();
        } catch (error) {
            console.warn("PiP error:", error);
        }
    }, [showControlsTemporarily]);

    const cycleContentFit = useCallback(() => {
        const currentIndex = contentFitOptions.indexOf(resizeMode);
        const nextIndex = (currentIndex + 1) % contentFitOptions.length;
        setResizeMode(contentFitOptions[nextIndex]);
        
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
    }, [resizeMode, showControlsTemporarily, contentFitLabelOpacity]);

    const seekTo = useCallback((seconds: number) => {
        if (!isReady || duration <= 0 || !vlcPlayerRef.current) return;

        const clampedTime = Math.max(0, Math.min(duration, seconds));
        const percentage = clampedTime / duration; // VLC seek expects percentage (0-1)
        vlcPlayerRef.current.seek(percentage);
        setCurrentTime(clampedTime);
        showControlsTemporarily();
    }, [duration, showControlsTemporarily, isReady]);

    const skipTime = useCallback((seconds: number) => {
        if (!isReady || duration <= 0) return;

        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        seekTo(newTime);
    }, [currentTime, duration, seekTo, isReady]);

    // Separate mute toggle
    const toggleMute = useCallback(() => {
        setIsMuted(!isMuted);
        showControlsTemporarily();
    }, [isMuted, showControlsTemporarily]);

    // Volume slider control
    const toggleVolumeSlider = useCallback(() => {
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

    const getCurrentChapter = useCallback(() => {
        return chapters.findLast(chapter => chapter.start <= currentTime);
    }, [chapters, currentTime]);

    const changePlaybackSpeed = useCallback((speed: number) => {
        setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const changeContentFit = useCallback((fit: PlayerResizeMode) => {
        setResizeMode(fit);
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
    }, [duration, isReady, progressBarValue]);

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
        } else {
            showControlsTemporarily();
        }
    }, [showSettings, showChapters, showVolumeSlider, showControlsTemporarily]);

    const getContentFitIcon = useCallback(() => {
        switch (resizeMode) {
            case 'contain': return 'fit-screen';
            case 'cover': return 'crop';
            case 'fill': return 'fullscreen';
            default: return 'fit-screen';
        }
    }, [resizeMode]);

    const getContentFitLabel = useCallback(() => {
        switch (resizeMode) {
            case 'contain': return 'Fit';
            case 'cover': return 'Fill';
            case 'fill': return 'Stretch';
            default: return 'Fit';
        }
    }, [resizeMode]);

    const currentChapter = getCurrentChapter();
    const displayTime = isDragging ? dragPosition * duration : currentTime;
    const sliderValue = isDragging ? dragPosition : (duration > 0 ? currentTime / duration : 0);

    return (
        <View style={styles.container}>
            <VLCPlayer
                ref={vlcPlayerRef}
                style={styles.video}
                source={{ uri: videoUrl }}
                autoplay={autoPlay}
                volume={isMuted ? 0 : volume}
                paused={!isPlaying}
                resizeMode={resizeMode}
                rate={playbackSpeed}
                onProgress={onProgress}
                onPlaying={onPlaying}
                onPaused={onPaused}
                onBuffering={onBuffering}
                onError={onError}
                onEnd={onEnd}
                onLoad={onLoad}
            />

            {/* Loading indicator */}
            {isBuffering && (
                <Animated.View
                    style={[
                        styles.bufferingContainer,
                        { opacity: bufferOpacity }
                    ]}
                    pointerEvents="none"
                >
                    <ActivityIndicator size="large" color="white" />
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
                        <TouchableOpacity style={styles.backButton} onPress={onBack}>
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
                                onPress={toggleVolumeSlider}
                            >
                                <MaterialIcons
                                    name="tune"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {/* Content fit control */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={cycleContentFit}
                            >
                                <MaterialIcons
                                    name={getContentFitIcon()}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>
                          
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={togglePictureInPicture}
                            >
                                <MaterialIcons
                                    name="picture-in-picture-alt"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {chapters.length > 0 && (
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={() => {
                                        setShowChapters(!showChapters);
                                        setShowSettings(false);
                                        setShowVolumeSlider(false);
                                    }}
                                >
                                    <MaterialIcons name="list" size={24} color="white" />
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={() => {
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
                                maximumValue={100}
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
                                        onPress={() => changeContentFit(option.value as PlayerResizeMode)}
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
                                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
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
                                            onPress={() => setSelectedSubtitle(null)}
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
                                                onPress={() => setSelectedSubtitle(sub.language)}
                                            >
                                                <Text style={styles.subtitleOptionText}>
                                                    {sub.label}
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
                                        {audioTracks.map(track => (
                                            <TouchableOpacity
                                                key={track.id}
                                                style={[
                                                    styles.audioOption,
                                                    selectedAudioTrack === track.id && styles.audioOptionSelected
                                                ]}
                                                onPress={() => setSelectedAudioTrack(track.id)}
                                            >
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