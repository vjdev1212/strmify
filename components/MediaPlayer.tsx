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
} from "react-native";
import { PlayingChangeEventPayload, StatusChangeEventPayload, TimeUpdateEventPayload, useVideoPlayer, VideoView } from "expo-video";
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
    chapters: Chapter[];
    onBack: () => void;
    autoPlay?: boolean;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    subtitle,
    subtitles,
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
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [volume, setVolume] = useState(1.0);
    const [showChapters, setShowChapters] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isReady, setIsReady] = useState(false);

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
        if (!timeUpdate) return;

        const { currentTime: time, bufferedPosition } = timeUpdate;
        setCurrentTime(time);
        
        // Get duration from player status instead of bufferedPosition
        if (player.duration && player.duration > 0) {
            setDuration(player.duration);
            const progress = player.duration > 0 ? time / player.duration : 0;
            Animated.timing(progressBarValue, {
                toValue: progress,
                duration: 100,
                useNativeDriver: false,
            }).start();
        }
    }, [timeUpdate, player.duration]);

    const statusChange = useEvent(player, "statusChange");
    useEffect(() => {
        if (!statusChange) return;

        const { status } = statusChange;
                
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
            
            // Auto-play if requested and ready
            if (autoPlay) {
                player.play();
            }
        } else if (status === "error") {
            Alert.alert("Video Error", "Failed to load video. Please check the video URL and try again.");
            setIsBuffering(false);
        }
    }, [statusChange, autoPlay, player]);

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
            if (isPlaying) {
                Animated.timing(controlsOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => {
                    setShowControls(false);
                });
            }
        }, 3000);
    }, [isPlaying, controlsOpacity]);

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
        setShowSettings(false);
        showControlsTemporarily();
    }, [player, showControlsTemporarily]);

    // Gesture handler for seeking
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // Only respond to horizontal gestures
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
            },
            onPanResponderGrant: () => {
                showControlsTemporarily();
            },
            onPanResponderMove: (evt, gestureState) => {
                // Visual feedback could be added here
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (!isReady || duration <= 0) return;
                
                const { dx } = gestureState;
                const seekAmount = (dx / SCREEN_WIDTH) * duration;
                skipTime(seekAmount);
            },
        })
    ).current;

    const currentChapter = getCurrentChapter();

    return (
        <View style={styles.container}>
            <VideoView
                ref={videoRef}
                style={styles.video}
                player={player}
                allowsFullscreen={false}
                allowsPictureInPicture={false}
                nativeControls={false}
                contentFit="contain"
                {...panResponder.panHandlers}
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
                onPress={showControlsTemporarily}
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
                            {chapters.length > 0 && (
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={() => setShowChapters(!showChapters)}
                                >
                                    <MaterialIcons name="list" size={24} color="white" />
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={() => setShowSettings(!showSettings)}
                            >
                                <Ionicons name="settings-outline" size={24} color="white" />
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
                                size={48}
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
                        <View style={styles.progressContainer}>
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
                            </View>
                        </View>

                        <View style={styles.timeContainer}>
                            <Text style={styles.timeText}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </Text>
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
                <View style={styles.settingsPanel}>
                    <View style={styles.settingsContent}>
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
                    </View>
                </View>
            )}

            {/* Chapters panel */}
            {showChapters && chapters.length > 0 && (
                <View style={styles.chaptersPanel}>
                    <Text style={styles.chaptersPanelTitle}>Chapters</Text>
                    <View style={styles.chaptersContent}>
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
                    </View>
                </View>
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
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 40,
        padding: 20,
        marginHorizontal: 30,
    },
    disabledButton: {
        opacity: 0.5,
    },
    bottomControls: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 20,
        height: 100,
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
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
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
    settingsPanel: {
        position: 'absolute',
        right: 20,
        top: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 12,
        padding: 20,
        minWidth: 200,
    },
    settingsContent: {
        // Add styles as needed
    },
    settingsTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    speedOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
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
    subtitleOptions: {
        // Add styles as needed
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
    chaptersPanel: {
        position: 'absolute',
        left: 20,
        top: 100,
        bottom: 100,
        width: 300,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 12,
        padding: 20,
    },
    chaptersPanelTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    chaptersContent: {
        flex: 1,
    },
    chapterItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    chapterItemActive: {
        backgroundColor: 'rgba(0, 122, 255, 0.2)',
        borderRadius: 8,
        paddingHorizontal: 12,
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