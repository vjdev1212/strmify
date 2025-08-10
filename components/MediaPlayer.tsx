import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Animated,
    Dimensions,
    Modal,
    FlatList,
    ListRenderItem
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent, useEventListener } from "expo";
import * as ScreenOrientation from "expo-screen-orientation";
import { Ionicons } from "@expo/vector-icons";

export interface Subtitle {
    language: string;
    url: string;
    label: string;
}

export interface Chapter {
    title: string;
    start: number; // in seconds
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const controlsTimeoutRef = useRef<any>(null);

    // State management
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [showSubtitles, setShowSubtitles] = useState(false);
    const [showChapters, setShowChapters] = useState(false);
    const [selectedSubtitle, setSelectedSubtitle] = useState<Subtitle | null>(null);
    const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
    const [volume, setVolume] = useState(1);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [seeking, setSeeking] = useState(false);
    const [brightness, setBrightness] = useState(1);

    useEffect(() => {
        const lockLandscape = async () => {
            await ScreenOrientation.lockAsync(
                ScreenOrientation.OrientationLock.LANDSCAPE
            );
        };
        lockLandscape();

        return () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, []);

    const player = useVideoPlayer(videoUrl, (player) => {
        player.loop = true;
        player.volume = volume;
        player.timeUpdateEventInterval = 1;
        player.playbackRate = playbackRate;
        if (autoPlay) {
            player.play();
        }
    });

    // Event listeners
    useEventListener(player, "playingChange", ({ isPlaying }) => {
        setIsPlaying(isPlaying);
    });

    useEventListener(player, "timeUpdate", ({ currentTime }) => {
        if (!seeking) {
            setCurrentTime(currentTime);
            updateCurrentChapter(currentTime);
        }
    });

    useEventListener(player, "statusChange", ({ status, error }) => {
        console.log('status', status)
        // if (videoDuration && videoDuration > 0) {
        //     setDuration(videoDuration);
        // }
    });

    // Update current chapter based on time
    const updateCurrentChapter = (time: number) => {
        const chapter = chapters
            .slice()
            .reverse()
            .find(ch => ch.start <= time);
        if (chapter !== currentChapter) {
            setCurrentChapter(chapter || null);
        }
    };

    // Controls visibility management
    const showControls = useCallback(() => {
        setControlsVisible(true);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }

        controlsTimeoutRef.current = setTimeout(() => {
            hideControls();
        }, 4000);
    }, [fadeAnim]);

    const hideControls = useCallback(() => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setControlsVisible(false);
        });
    }, [fadeAnim]);

    const toggleControls = () => {
        if (controlsVisible) {
            hideControls();
        } else {
            showControls();
        }
    };

    // Playback controls
    const togglePlayPause = () => {
        if (isPlaying) {
            player.pause();
        } else {
            player.play();
        }
    };

    const seekTo = (position: number) => {
        player.currentTime = position;
        setCurrentTime(position);
    };

    const skipBackward = () => {
        const newTime = currentTime - 10;
        seekTo(newTime);
    };

    const skipForward = () => {
        const newTime = currentTime + 10;
        seekTo(newTime);
    };

    const goToChapter = (chapter: Chapter) => {
        seekTo(chapter.start);
        setShowChapters(false);
    };

    const changePlaybackRate = () => {
        const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIndex = rates.indexOf(playbackRate);
        const nextIndex = (currentIndex + 1) % rates.length;
        const newRate = rates[nextIndex];
        setPlaybackRate(newRate);
        player.playbackRate = newRate;
    };

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Progress bar component
    const ProgressBar: React.FC = () => {
        const progress = duration > 0 ? currentTime / duration : 0;

        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
                </View>
            </View>
        );
    };

    // Subtitle selection modal
    const SubtitleModal: React.FC = () => (
        <Modal
            visible={showSubtitles}
            transparent
            animationType="slide"
            onRequestClose={() => setShowSubtitles(false)}
        >
            <TouchableOpacity
                style={styles.modalContainer}
                activeOpacity={1}
                onPress={() => setShowSubtitles(false)}
            >
                <TouchableOpacity
                    style={styles.modalContent}
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Text style={styles.modalTitle}>Subtitles</Text>
                    <TouchableOpacity
                        style={styles.subtitleItem}
                        onPress={() => {
                            setSelectedSubtitle(null);
                            setShowSubtitles(false);
                        }}
                    >
                        <Text style={styles.subtitleText}>Off</Text>
                        {!selectedSubtitle && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                    </TouchableOpacity>
                    {subtitles.map((sub, index) => (
                        <TouchableOpacity
                            key={`subtitle-${index}`}
                            style={styles.subtitleItem}
                            onPress={() => {
                                setSelectedSubtitle(sub);
                                setShowSubtitles(false);
                            }}
                        >
                            <Text style={styles.subtitleText}>{sub.label}</Text>
                            {selectedSubtitle?.language === sub.language && (
                                <Ionicons name="checkmark" size={20} color="#007AFF" />
                            )}
                        </TouchableOpacity>
                    ))}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );

    // Chapter selection modal
    const ChapterModal: React.FC = () => {
        const renderChapter: ListRenderItem<Chapter> = ({ item }) => (
            <TouchableOpacity
                style={styles.chapterItem}
                onPress={() => goToChapter(item)}
            >
                <Text style={styles.chapterTitle}>{item.title}</Text>
                <Text style={styles.chapterTime}>{formatTime(item.start)}</Text>
                {currentChapter?.title === item.title && (
                    <Ionicons name="play" size={16} color="#007AFF" />
                )}
            </TouchableOpacity>
        );

        return (
            <Modal
                visible={showChapters}
                transparent
                animationType="slide"
                onRequestClose={() => setShowChapters(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Chapters</Text>
                        <FlatList
                            data={chapters}
                            keyExtractor={(item, index) => `chapter-${index}`}
                            renderItem={renderChapter}
                        />
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.videoContainer}
                activeOpacity={1}
                onPress={toggleControls}
            >
                <VideoView
                    style={styles.video}
                    ref={videoRef}
                    allowsFullscreen={true}
                    allowsPictureInPicture={false}
                    allowsVideoFrameAnalysis={false}
                    nativeControls={false}
                    showsTimecodes={false}
                    player={player}
                />
            </TouchableOpacity>

            {/* Custom Controls Overlay */}
            <Animated.View
                style={[
                    styles.controlsOverlay,
                    { opacity: fadeAnim }
                ]}
                pointerEvents={controlsVisible ? 'auto' : 'none'}
            >
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.backButton} onPress={onBack}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title} numberOfLines={1}>{title}</Text>
                        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
                        {currentChapter && (
                            <Text style={styles.chapterIndicator}>{currentChapter.title}</Text>
                        )}
                    </View>
                    <View style={styles.topRightControls}>
                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={() => setShowSubtitles(true)}
                        >
                            <Ionicons name="text" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={() => setShowChapters(true)}
                        >
                            <Ionicons name="list" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Center Play Controls */}
                <View style={styles.centerControls}>
                    <TouchableOpacity style={styles.seekButton} onPress={skipBackward}>
                        <Ionicons name="play-back" size={40} color="white" />
                        <Text style={styles.seekText}>10</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={50}
                            color="white"
                        />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.seekButton} onPress={skipForward}>
                        <Ionicons name="play-forward" size={40} color="white" />
                        <Text style={styles.seekText}>10</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom Bar */}
                <View style={styles.bottomBar}>
                    <View style={styles.timeContainer}>
                        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                        <ProgressBar />
                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>

                    <View style={styles.bottomControls}>
                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={changePlaybackRate}
                        >
                            <Text style={styles.playbackRateText}>{playbackRate}x</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.controlButton}
                            onPress={() => videoRef.current?.enterFullscreen()}
                        >
                            <Ionicons name="expand" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>

            <SubtitleModal />
            <ChapterModal />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    videoContainer: {
        flex: 1,
    },
    video: {
        flex: 1,
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 10,
    },
    titleContainer: {
        flex: 1,
        marginHorizontal: 20,
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        marginTop: 2,
    },
    chapterIndicator: {
        color: '#007AFF',
        fontSize: 12,
        marginTop: 2,
    },
    topRightControls: {
        flexDirection: 'row',
    },
    controlButton: {
        padding: 10,
        marginLeft: 5,
    },
    centerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
    },
    playButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 35,
        width: 70,
        height: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    seekButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 25,
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    seekText: {
        color: 'white',
        fontSize: 10,
        position: 'absolute',
        bottom: 8,
        marginTop: 10
    },
    bottomBar: {
        gap: 15,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    timeText: {
        color: 'white',
        fontSize: 14,
        minWidth: 40,
    },
    progressContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        position: 'relative',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 2,
    },
    progressThumb: {
        position: 'absolute',
        top: -4,
        width: 12,
        height: 12,
        backgroundColor: '#007AFF',
        borderRadius: 6,
        marginLeft: -6,
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    playbackRateText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1c1c1e',
        borderRadius: 12,
        padding: 20,
        width: '80%',
        maxHeight: '70%',
    },
    modalTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    subtitleItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    subtitleText: {
        color: 'white',
        fontSize: 16,
    },
    chapterItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    chapterTitle: {
        color: 'white',
        fontSize: 16,
        flex: 1,
    },
    chapterTime: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        marginRight: 10,
    },
});