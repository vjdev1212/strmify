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
    Alert,
    ScrollView,
} from "react-native";
import { useVideoPlayer, VideoContentFit, VideoView } from "expo-video";
import { useEvent } from "expo";
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

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
    subtitles: Subtitle[];
    audioTracks: AudioTrack[];
    chapters: Chapter[];
    onBack: () => void;
    autoPlay?: boolean;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    subtitle,
    subtitles,
    audioTracks,
    chapters,
    onBack,
    autoPlay = true,
}) => {
    const videoRef = useRef<VideoView>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(false);
    const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<string | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [volume, setVolume] = useState(1.0);
    const [showChapters, setShowChapters] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [contentFit, setContentFit] = useState<VideoContentFit>('contain');
    const [isPiPEnabled, setIsPiPEnabled] = useState(false);

    // Animated values
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const progressBarValue = useRef(new Animated.Value(0)).current;
    const bufferOpacity = useRef(new Animated.Value(0)).current;

    // Auto-hide controls timer
    const hideControlsTimer = useRef<any>(null);

    useEffect(() => {
        const setupOrientation = async () => {
            await ScreenOrientation.lockAsync(
                ScreenOrientation.OrientationLock.LANDSCAPE
            );
            StatusBar.setHidden(true);
        };
        setupOrientation();

        return () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            StatusBar.setHidden(false);
            if (hideControlsTimer.current) {
                clearTimeout(hideControlsTimer.current);
            }
        };
    }, []);

    const player = useVideoPlayer(videoUrl, (player) => {
        player.loop = false;
        player.muted = false;
        player.volume = volume;
        player.playbackRate = playbackSpeed;
    });

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
    }, [playingChange]);

    const timeUpdate = useEvent(player, "timeUpdate");
    useEffect(() => {
        if (!timeUpdate || isDragging) return;

        const { currentTime: time } = timeUpdate;
        setCurrentTime(time);

        if (player.duration && player.duration > 0) {
            setDuration(player.duration);
            const progress = player.duration > 0 ? time / player.duration : 0;
            Animated.timing(progressBarValue, {
                toValue: progress,
                duration: 100,
                useNativeDriver: false,
            }).start();
        }
    }, [timeUpdate, player.duration, isDragging]);

    const statusChange = useEvent(player, "statusChange");
    useEffect(() => {
        if (!statusChange) return;

        const { status } = statusChange;

        console.log('Video status changed:', status);

        if (status === "loading") {
            setIsBuffering(true);
            Animated.timing(bufferOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        } else if (status === "readyToPlay") {
            setIsBuffering(false);
            setIsReady(true);
            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();

            if (autoPlay) {
                player.play();
            }
        } else if (status === "error") {
            Alert.alert("Video Error", "Failed to load video. Please check the video URL and try again.");
            setIsBuffering(false);
        }
    }, [statusChange, autoPlay, player]);


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
            if (isPlaying && !showSettings && !showChapters) {
                Animated.timing(controlsOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => {
                    setShowControls(false);
                });
            }
        }, 3000);
    }, [isPlaying, controlsOpacity, showSettings, showChapters]);

    // Control functions
    const togglePlayPause = useCallback(() => {
        if (!isReady) return;

        if (isPlaying) {
            player.pause();
        } else {
            player.play();
        }
        showControlsTemporarily();
    }, [isPlaying, player, isReady]);

    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(!isFullscreen);
        showControlsTemporarily();
    }, [isFullscreen]);

    const togglePictureInPicture = useCallback(async () => {
        try {
            if (isPiPEnabled) {
                setIsPiPEnabled(false);
            } else {
                setIsPiPEnabled(true);
            }
            showControlsTemporarily();
        } catch (error) {
            Alert.alert("Picture-in-Picture Error", "PiP mode is not supported on this device.");
        }
    }, [isPiPEnabled, showControlsTemporarily]);

    const changeContentFit = useCallback((fit: VideoContentFit) => {
        setContentFit(fit);
        showControlsTemporarily();
    }, [showControlsTemporarily]);


    const seekTo = useCallback((seconds: number) => {
        if (!isReady || duration <= 0) return;

        const clampedTime = Math.max(0, Math.min(duration, seconds));
        player.seekBy(clampedTime - currentTime);
        showControlsTemporarily();
    }, [currentTime, duration, player, showControlsTemporarily, isReady]);

    const skipTime = useCallback((seconds: number) => {
        if (!isReady || duration <= 0) return;

        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        seekTo(newTime);
    }, [currentTime, duration, seekTo, isReady]);

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
        player.playbackRate = speed;
        showControlsTemporarily();
    }, [player, showControlsTemporarily]);

    // Progress bar pan responder
    const progressPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                setIsDragging(true);
                showControlsTemporarily();
                const { locationX } = evt.nativeEvent;
                const progressBarWidth = SCREEN_WIDTH - 80;
                const progress = Math.max(0, Math.min(1, locationX / progressBarWidth));
                setDragPosition(progress);
            },
            onPanResponderMove: (evt) => {
                const { locationX } = evt.nativeEvent;
                const progressBarWidth = SCREEN_WIDTH - 80;
                const progress = Math.max(0, Math.min(1, locationX / progressBarWidth));
                setDragPosition(progress);

                Animated.timing(progressBarValue, {
                    toValue: progress,
                    duration: 0,
                    useNativeDriver: false,
                }).start();
            },
            onPanResponderRelease: () => {
                setIsDragging(false);
                if (duration > 0) {
                    const newTime = dragPosition * duration;
                    seekTo(newTime);
                }
            },
        })
    ).current;

    // Close panels when touching outside
    const handleOverlayPress = useCallback(() => {
        if (showSettings) {
            setShowSettings(false);
        } else if (showChapters) {
            setShowChapters(false);
        } else {
            showControlsTemporarily();
        }
    }, [showSettings, showChapters, showControlsTemporarily]);

    const currentChapter = getCurrentChapter();
    const displayTime = isDragging ? dragPosition * duration : currentTime;

    return (
        <View style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
            <VideoView
                ref={videoRef}
                style={styles.video}
                player={player}
                allowsFullscreen={false}
                allowsPictureInPicture={true}
                nativeControls={false}
                contentFit={contentFit}
            />

            {/* Buffering indicator */}
            <Animated.View
                style={[
                    styles.bufferingContainer,
                    { opacity: bufferOpacity }
                ]}
                pointerEvents="none"
            >
                <MaterialIcons name="sync" size={40} color="white" />
                <Text style={styles.bufferingText}>Loading...</Text>
            </Animated.View>

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
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={togglePictureInPicture}
                            >
                                <MaterialIcons
                                    name="picture-in-picture-alt"
                                    size={24}
                                    color={isPiPEnabled ? "#007AFF" : "white"}
                                />
                            </TouchableOpacity>

                            {chapters.length > 0 && (
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={() => {
                                        setShowChapters(!showChapters);
                                        setShowSettings(false);
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
                                }}
                            >
                                <Ionicons name="settings-outline" size={24} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={toggleFullscreen}
                            >
                                <MaterialIcons
                                    name={isFullscreen ? "fullscreen-exit" : "fullscreen"}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* Center controls */}
                    <View style={styles.centerControls}>
                        <TouchableOpacity
                            style={[styles.skipButton, !isReady && styles.disabledButton]}
                            onPress={() => skipTime(-10)}
                            disabled={!isReady}
                        >
                            <MaterialIcons name="replay-10" size={36} color={isReady ? "white" : "rgba(255,255,255,0.5)"} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.playButton, !isReady && styles.disabledButton]}
                            onPress={togglePlayPause}
                            disabled={!isReady}
                        >
                            <Ionicons
                                name={isPlaying ? "pause" : "play"}
                                size={32}
                                color={isReady ? "white" : "rgba(255,255,255,0.5)"}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.skipButton, !isReady && styles.disabledButton]}
                            onPress={() => skipTime(30)}
                            disabled={!isReady}
                        >
                            <MaterialIcons name="forward-30" size={36} color={isReady ? "white" : "rgba(255,255,255,0.5)"} />
                        </TouchableOpacity>
                    </View>

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

                        <View style={styles.progressContainer} {...progressPanResponder.panHandlers}>
                            <View style={styles.progressBar}>
                                <View style={styles.progressTrack} />
                                <Animated.View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: progressBarValue.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '100%'],
                                                extrapolate: 'clamp',
                                            }),
                                        },
                                    ]}
                                />
                                <Animated.View
                                    style={[
                                        styles.progressThumb,
                                        {
                                            left: progressBarValue.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '100%'],
                                                extrapolate: 'clamp',
                                            }),
                                        },
                                    ]}
                                />
                            </View>
                        </View>

                        <View style={styles.bottomRightControls}>
                            {playbackSpeed !== 1.0 && (
                                <Text style={styles.speedText}>
                                    {playbackSpeed}x
                                </Text>
                            )}
                        </View>
                    </LinearGradient>
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
                            <Text style={styles.settingsTitle}>Video Scale</Text>
                            <View style={styles.scaleOptions}>
                                {[
                                    { value: 'contain', label: 'Fit' },
                                    { value: 'cover', label: 'Fill' },
                                    { value: 'fill', label: 'Stretch' },
                                    { value: 'scaleDown', label: 'Scale Down' }
                                ].map(option => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.scaleOption,
                                            contentFit === option.value && styles.scaleOptionSelected
                                        ]}
                                        onPress={() => changeContentFit(option.value as any)}
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
                        <Text style={styles.chaptersPanelTitle}>Chapters</Text>
                        <ScrollView style={styles.chaptersContent}>
                            {chapters.map((chapter: Chapter, index: number) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.chapterItem,
                                        currentChapter?.title === chapter.title && styles.chapterItemActive
                                    ]}
                                    onPress={() => {
                                        seekTo(chapter.start);
                                        setShowChapters(false);
                                    }}
                                >
                                    <Text style={styles.chapterTime}>
                                        {formatTime(chapter.start)}
                                    </Text>
                                    <Text style={styles.chapterTitle} numberOfLines={2}>
                                        {chapter.title}
                                    </Text>
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
    fullscreenContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
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
        paddingTop: 40,
        paddingBottom: 20,
        height: 100,
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
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
        marginBottom: 10,
    },
    progressContainer: {
        marginBottom: 16,
        paddingVertical: 10,
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        position: 'relative',
        overflow: 'visible',
    },
    progressTrack: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    progressFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundColor: '#007AFF',
    },
    progressThumb: {
        position: 'absolute',
        top: -6,
        width: 16,
        height: 16,
        backgroundColor: '#007AFF',
        borderRadius: 8,
        marginLeft: -8,
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
    },
    speedText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '500',
    },
    bufferingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    bufferingText: {
        color: 'white',
        fontSize: 16,
        marginTop: 8,
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
        width: '80%',
        maxHeight: '70%',
    },
    chaptersPanelTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    chaptersContent: {
        maxHeight: 400,
    },
    chapterItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 6,
        marginBottom: 4,
    },
    chapterItemActive: {
        backgroundColor: 'rgba(0, 122, 255, 0.2)',
    },
    chapterTime: {
        color: '#007AFF',
        fontSize: 12,
        fontWeight: '500',
        minWidth: 50,
        marginRight: 12,
    },
    chapterTitle: {
        color: 'white',
        fontSize: 14,
        flex: 1,
    },
});