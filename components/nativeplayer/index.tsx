import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    View, Text, TouchableOpacity, Animated, StatusBar,
    ActivityIndicator, Platform, Image,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import Slider from '@react-native-assets/slider';
import { MenuView } from '@react-native-menu/menu';
import { WebMenu } from "@/components/WebMenuView";
import { showAlert } from "@/utils/platform";
import { styles } from "./styles";
import { MediaPlayerProps, DownloadResponse } from "./models";
import { playHaptic, formatTime } from "./utils";
import { parseSubtitleFile } from "./subtitle";

// Constants
const CONTENT_FIT_LABEL_DELAY = 1000;
const SUBTITLE_UPDATE_INTERVAL = 100;
const CONTROLS_AUTO_HIDE_DELAY = 3000;
const PLAYBACK_SPEEDS = [0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.1, 1.15, 1.20, 1.25];
const CONTENT_FIT_OPTIONS: Array<'contain' | 'cover' | 'fill'> = ['contain', 'cover', 'fill'];

// Subtitle hook
const useSubtitles = () => {
    const [currentSubtitle, setCurrentSubtitle] = useState('');
    const [parsedSubtitles, setParsedSubtitles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    return { currentSubtitle, setCurrentSubtitle, parsedSubtitles, setParsedSubtitles, isLoading, setIsLoading };
};

// Menu wrapper component - uses CustomMenu on web, MenuView on native
const MenuWrapper: React.FC<any> = (props) => {
    if (Platform.OS === 'web') {
        return <WebMenu {...props} />;
    }
    return <MenuView {...props} />;
};

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl, title, back: onBack, artwork, subtitles = [], openSubtitlesClient, switchMediaPlayer, updateProgress
}) => {
    const videoRef = useRef<VideoView>(null);
    const hideControlsTimer = useRef<any>(null);
    const contentFitLabelTimer = useRef<any>(null);
    const shouldAutoHideControls = useRef(true);

    // Animation refs
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;
    const contentFitLabelOpacity = useRef(new Animated.Value(0)).current;

    // Player state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [loadingText, setLoadingText] = useState('Loading...');

    // UI state
    const [showControls, setShowControls] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [contentFit, setContentFit] = useState<'contain' | 'cover' | 'fill'>('cover');
    const [showContentFitLabel, setShowContentFitLabel] = useState(false);

    // Settings state
    const [selectedSubtitle, setSelectedSubtitle] = useState(-1);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState(-1);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);

    // Custom hooks
    const subtitleState = useSubtitles();

    const useCustomSubtitles = subtitles.length > 0;

    // Initialize player
    const player = useVideoPlayer({
        uri: videoUrl,
        metadata: { title, artwork }
    }, (player) => {
        player.loop = false;
        player.muted = isMuted;
        player.playbackRate = playbackSpeed;
    });

    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

        clearTimeout(hideControlsTimer.current);

        if (isPlaying && shouldAutoHideControls.current) {
            hideControlsTimer.current = setTimeout(() => {
                Animated.timing(controlsOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
                    .start(() => setShowControls(false));
            }, CONTROLS_AUTO_HIDE_DELAY);
        }
    }, [isPlaying, controlsOpacity]);

    // Orientation and cleanup
    useEffect(() => {
        const setupOrientation = async () => {
            if (Platform.OS !== 'web') {
                try {
                    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                    StatusBar.setHidden(true);
                } catch (error) {
                    console.warn("Failed to set orientation:", error);
                }
            }
        };

        setupOrientation();

        return () => {
            if (Platform.OS !== 'web') {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                StatusBar.setHidden(false);
            }
            clearTimeout(hideControlsTimer.current);
            clearTimeout(contentFitLabelTimer.current);
        };
    }, []);

    // Update player settings
    useEffect(() => {
        if (player) {
            player.muted = isMuted;
            player.playbackRate = playbackSpeed;
        }
    }, [player, isMuted, playbackSpeed]);

    // Load subtitles
    useEffect(() => {
        if (!useCustomSubtitles || selectedSubtitle < 0 || selectedSubtitle >= subtitles.length) {
            subtitleState.setParsedSubtitles([]);
            subtitleState.setCurrentSubtitle('');
            return;
        }

        const loadSubtitle = async (sub: any) => {
            subtitleState.setIsLoading(true);

            try {
                let subtitleContent = '';

                if (sub.fileId && openSubtitlesClient) {
                    const response = await openSubtitlesClient.downloadSubtitle(String(sub.fileId));

                    if ('error' in response || 'status' in response && response.status !== 200) {
                        throw new Error(response.message || 'Download failed');
                    }

                    const downloadResponse = response as DownloadResponse;
                    if (!downloadResponse.link) throw new Error('No download link');

                    const subResponse = await fetch(downloadResponse.link);
                    if (!subResponse.ok) throw new Error(`HTTP ${subResponse.status}`);
                    subtitleContent = await subResponse.text();
                } else if (sub.url && !sub.url.includes('opensubtitles.org')) {
                    const response = await fetch(sub.url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    subtitleContent = await response.text();
                } else {
                    throw new Error('No valid subtitle source');
                }

                const parsed = parseSubtitleFile(subtitleContent);
                subtitleState.setParsedSubtitles(parsed);
            } catch (error: any) {
                console.error('Subtitle load error:', error);
                subtitleState.setParsedSubtitles([]);
                showAlert("Subtitle Error", `Failed to load: ${error.message}`);
            } finally {
                subtitleState.setIsLoading(false);
                subtitleState.setCurrentSubtitle('');
            }
        };

        loadSubtitle(subtitles[selectedSubtitle]);
    }, [selectedSubtitle, subtitles, openSubtitlesClient, useCustomSubtitles]);

    // Update subtitle display
    useEffect(() => {
        if (subtitleState.parsedSubtitles.length === 0) return;

        const updateSubtitle = () => {
            const time = player.currentTime;
            const active = subtitleState.parsedSubtitles.find(sub => time >= sub.start && time <= sub.end);
            subtitleState.setCurrentSubtitle(active?.text || '');
        };

        updateSubtitle();
        const interval = setInterval(updateSubtitle, SUBTITLE_UPDATE_INTERVAL);
        return () => clearInterval(interval);
    }, [subtitleState.parsedSubtitles, player]);

    // Player event handlers
    const playingChange = useEvent(player, "playingChange");
    useEffect(() => {
        if (!playingChange) return;
        setIsPlaying(playingChange.isPlaying);
        if (playingChange.isPlaying) {
            setIsBuffering(false);
            Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
    }, [playingChange]);

    const timeUpdate = useEvent(player, "timeUpdate");
    useEffect(() => {
        if (!timeUpdate || isDragging) return;

        setCurrentTime(timeUpdate.currentTime);
        const videoDuration = player.duration || 0;

        if (videoDuration > 0) {
            setDuration(videoDuration);
        }
    }, [timeUpdate, isDragging]);

    const statusChange = useEvent(player, "statusChange");
    useEffect(() => {
        if (!statusChange) return;

        const { status, error } = statusChange;
        if (error) console.log('Video error:', error.message);

        switch (status) {
            case "loading":
                if (!isReady) {
                    setIsBuffering(true);
                    Animated.timing(bufferOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
                }
                break;

            case "readyToPlay":
                setIsBuffering(false);
                setIsReady(true);
                setDuration(player.duration || 0);
                Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
                player.play();
                break;

            case "error":
                if (!isReady) {
                    showAlert("Playback Error", "Unable to load the video. Try with VLC.");
                    setLoadingText("Unable to load the video. Retrying with VLC...");
                }
                setIsBuffering(false);
                break;
        }
    }, [statusChange, isReady]);

    // Auto-hide controls when playback starts
    useEffect(() => {
        if (isPlaying && showControls && shouldAutoHideControls.current) {
            showControlsTemporarily();
        }
    }, [isPlaying, showControlsTemporarily]);

    const showContentFitLabelTemporarily = useCallback(() => {
        setShowContentFitLabel(true);
        Animated.timing(contentFitLabelOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

        clearTimeout(contentFitLabelTimer.current);
        contentFitLabelTimer.current = setTimeout(() => {
            Animated.timing(contentFitLabelOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
                .start(() => setShowContentFitLabel(false));
        }, CONTENT_FIT_LABEL_DELAY);
    }, []);

    // Control actions
    const togglePlayPause = useCallback(async () => {
        if (!isReady) return;
        await playHaptic();
        isPlaying ? player.pause() : player.play();
        showControlsTemporarily();
    }, [isPlaying, player, isReady, showControlsTemporarily]);

    const seekTo = useCallback((seconds: number) => {
        if (!isReady || duration <= 0) return;
        const clampedTime = Math.max(0, Math.min(duration, seconds));
        player.currentTime = clampedTime;
        setCurrentTime(clampedTime);
        showControlsTemporarily();
    }, [duration, player, isReady, showControlsTemporarily]);

    const skipTime = useCallback(async (seconds: number) => {
        if (!isReady) return;
        await playHaptic();
        seekTo(currentTime + seconds);
    }, [currentTime, seekTo, isReady]);

    const cycleContentFit = useCallback(async () => {
        await playHaptic();
        const currentIndex = CONTENT_FIT_OPTIONS.indexOf(contentFit);
        setContentFit(CONTENT_FIT_OPTIONS[(currentIndex + 1) % CONTENT_FIT_OPTIONS.length]);
        showContentFitLabelTemporarily();
        showControlsTemporarily();
    }, [contentFit, showControlsTemporarily, showContentFitLabelTemporarily]);

    const handleOverlayPress = useCallback(() => {
        if (showControls) {
            Animated.timing(controlsOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
                .start(() => setShowControls(false));
        } else {
            showControlsTemporarily();
        }
    }, [showControls, showControlsTemporarily]);

    // Slider handlers
    const handleSliderChange = useCallback((value: number) => {
        if (!isReady || duration <= 0) return;
        setIsDragging(true);
        setDragPosition(value);
        setCurrentTime(value * duration);
    }, [duration, isReady]);

    const handleSliderComplete = useCallback((value: number) => {
        setIsDragging(false);
        if (isReady && duration > 0) seekTo(value * duration);
    }, [duration, seekTo, isReady]);

    // Menu handlers
    const handleSpeedSelect = useCallback(async (speed: number) => {
        await playHaptic();
        setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleSubtitleSelect = useCallback(async (index: number) => {
        await playHaptic();
        setSelectedSubtitle(index);
        if (!useCustomSubtitles && index >= 0) {
            player.subtitleTrack = player.availableSubtitleTracks[index];
        } else if (!useCustomSubtitles && index === -1) {
            player.subtitleTrack = null;
        }
    }, [useCustomSubtitles, player]);

    const handleAudioSelect = useCallback(async (index: number) => {
        await playHaptic();
        setSelectedAudioTrack(index);
        player.audioTrack = player.availableAudioTracks[index];
    }, [player]);

    // Render helpers
    const getContentFitIcon = (): "fit-screen" | "crop" | "fullscreen" => {
        const icons = { contain: 'fit-screen', cover: 'crop', fill: 'fullscreen' } as const;
        return icons[contentFit];
    };

    // Build menu actions
    const speedActions = PLAYBACK_SPEEDS.map(speed => ({
        id: `speed-${speed}`,
        title: `${speed}x`,
        state: playbackSpeed === speed ? 'on' as const : undefined,
        titleColor: playbackSpeed === speed ? '#007AFF' : '#FFFFFF',
    }));

    const subtitleActions = [
        {
            id: 'subtitle-off',
            title: 'Off',
            state: selectedSubtitle === -1 ? 'on' as const : undefined,
            titleColor: selectedSubtitle === -1 ? '#007AFF' : '#FFFFFF',
        },
        ...(useCustomSubtitles
            ? subtitles.map((sub, i) => ({
                id: `subtitle-${i}`,
                title: sub.label,
                subtitle: sub.fileId ? 'OpenSubtitles' : undefined,
                state: selectedSubtitle === i ? 'on' as const : undefined,
                titleColor: selectedSubtitle === i ? '#007AFF' : '#FFFFFF',
            }))
            : player.availableSubtitleTracks.map((sub, i) => ({
                id: `subtitle-${i}`,
                title: sub.label,
                state: selectedSubtitle === i ? 'on' as const : undefined,
                titleColor: selectedSubtitle === i ? '#007AFF' : '#FFFFFF',
            }))
        ),
    ];

    const audioActions = player.availableAudioTracks.map((track, i) => ({
        id: `audio-${i}`,
        title: track.label,
        state: selectedAudioTrack === i ? 'on' as const : undefined,
        titleColor: selectedAudioTrack === i ? '#007AFF' : '#FFFFFF',
    }));

    const displayTime = isDragging ? dragPosition * duration : currentTime;
    const sliderValue = isDragging ? dragPosition : (duration > 0 ? currentTime / duration : 0);

    return (
        <View style={styles.container}>
            <VideoView
                ref={videoRef}
                style={styles.video}
                player={player}
                fullscreenOptions={{ enable: true, orientation: 'landscape' }}
                allowsPictureInPicture
                nativeControls={false}
                contentFit={contentFit}
            />

            {artwork && isBuffering && (
                <View style={styles.artworkContainer}>
                    <Image source={{ uri: artwork }} style={styles.artworkImage} resizeMode="cover" />
                    <View style={styles.artworkOverlay} />
                </View>
            )}

            {isBuffering && (
                <Animated.View style={[styles.bufferingContainer, { opacity: bufferOpacity }]} pointerEvents="none">
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.bufferingText}>{loadingText}</Text>
                </Animated.View>
            )}

            <TouchableOpacity style={styles.touchArea} activeOpacity={1} onPress={handleOverlayPress} />

            {useCustomSubtitles && subtitleState.currentSubtitle && (
                <View style={styles.subtitleContainer} pointerEvents="none">
                    <View style={styles.subtitleBackground}>
                        <Text style={styles.subtitleText}>{subtitleState.currentSubtitle}</Text>
                    </View>
                </View>
            )}

            {!isReady && (
                <View style={styles.persistentBackButton} pointerEvents="box-none">
                    <TouchableOpacity style={styles.backButtonPersistent} onPress={async () => {
                        await playHaptic();
                        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
                        updateProgress({ progress });
                        onBack({ message: '', player: "native" });
                    }}>
                        <View style={styles.backButtonGradient}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {showControls && (
                <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]} pointerEvents="box-none">
                    <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={styles.topControls}>
                        <TouchableOpacity style={styles.backButton} onPress={async () => {
                            await playHaptic();
                            const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
                            updateProgress({ progress });
                            onBack({ message: '', player: "native" });
                        }}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                        </View>

                        <View style={styles.topRightControls}>
                            {switchMediaPlayer && Platform.OS !== 'web' && (
                                <TouchableOpacity style={styles.controlButton} onPress={async () => {
                                    await playHaptic();
                                    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
                                    switchMediaPlayer({ message: '', player: "native", progress: progress });
                                }}>
                                    <MaterialCommunityIcons name="vlc" size={24} color="white" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.controlButton} onPress={async () => { await playHaptic(); setIsMuted(!isMuted); showControlsTemporarily(); }}>
                                <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.controlButton} onPress={cycleContentFit}>
                                <MaterialIcons name={getContentFitIcon()} size={24} color="white" />
                            </TouchableOpacity>

                            {/* Audio Track Menu */}
                            {player.availableAudioTracks.length > 0 && (
                                <MenuWrapper
                                    style={{ zIndex: 1000 }}
                                    title="Audio Track"
                                    onPressAction={Platform.OS === 'web' ? (id: string) => {
                                        const index = audioActions.findIndex(a => a.id === id);
                                        if (index !== -1) handleAudioSelect(index);
                                    } : ({ nativeEvent }: any) => {
                                        const index = audioActions.findIndex(a => a.id === nativeEvent.event);
                                        if (index !== -1) handleAudioSelect(index);
                                    }}
                                    actions={audioActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={() => {
                                        shouldAutoHideControls.current = false;
                                        clearTimeout(hideControlsTimer.current);
                                    }}
                                    onCloseMenu={() => {
                                        shouldAutoHideControls.current = true;
                                        showControlsTemporarily();
                                    }}
                                >
                                    <View style={styles.controlButton}>
                                        <MaterialIcons name="audiotrack" size={24} color="white" />
                                    </View>
                                </MenuWrapper>
                            )}

                            {/* Subtitle Menu */}
                            {(useCustomSubtitles || player.availableSubtitleTracks.length > 0) && (
                                <MenuWrapper
                                    style={{ zIndex: 1000 }}
                                    title="Subtitles"
                                    onPressAction={Platform.OS === 'web' ? (id: string) => {
                                        if (id === 'subtitle-off') {
                                            handleSubtitleSelect(-1);
                                        } else {
                                            const index = parseInt(id.split('-')[1]);
                                            if (!isNaN(index)) handleSubtitleSelect(index);
                                        }
                                    } : ({ nativeEvent }: any) => {
                                        if (nativeEvent.event === 'subtitle-off') {
                                            handleSubtitleSelect(-1);
                                        } else {
                                            const index = parseInt(nativeEvent.event.split('-')[1]);
                                            if (!isNaN(index)) handleSubtitleSelect(index);
                                        }
                                    }}
                                    actions={subtitleActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={() => {
                                        shouldAutoHideControls.current = false;
                                        clearTimeout(hideControlsTimer.current);
                                    }}
                                    onCloseMenu={() => {
                                        shouldAutoHideControls.current = true;
                                        showControlsTemporarily();
                                    }}
                                >
                                    <View style={styles.controlButton}>
                                        <MaterialIcons name="closed-caption" size={24} color="white" />
                                    </View>
                                </MenuWrapper>
                            )}

                            {/* Speed Menu */}
                            <MenuWrapper
                                style={{ zIndex: 1000 }}
                                title="Playback Speed"
                                onPressAction={Platform.OS === 'web' ? (id: string) => {
                                    const speed = parseFloat(id.split('-')[1]);
                                    if (!isNaN(speed)) handleSpeedSelect(speed);
                                } : ({ nativeEvent }: any) => {
                                    const speed = parseFloat(nativeEvent.event.split('-')[1]);
                                    if (!isNaN(speed)) handleSpeedSelect(speed);
                                }}
                                actions={speedActions}
                                shouldOpenOnLongPress={false}
                                themeVariant="dark"
                                onOpenMenu={() => {
                                    shouldAutoHideControls.current = false;
                                    clearTimeout(hideControlsTimer.current);
                                }}
                                onCloseMenu={() => {
                                    shouldAutoHideControls.current = true;
                                    showControlsTemporarily();
                                }}
                            >
                                <View style={styles.controlButton}>
                                    <MaterialIcons name="speed" size={24} color={"white"} />
                                </View>
                            </MenuWrapper>
                        </View>
                    </LinearGradient>

                    {!isBuffering && (
                        <View style={styles.centerControls}>
                            <TouchableOpacity style={[styles.skipButton, !isReady && styles.disabledButton]} onPress={() => skipTime(-10)} disabled={!isReady}>
                                <MaterialIcons name="replay-10" size={36} color={isReady ? "white" : "rgba(255,255,255,0.5)"} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.playButton, !isReady && styles.disabledButton]} onPress={togglePlayPause} disabled={!isReady}>
                                <Ionicons name={isPlaying ? "pause" : "play"} size={60} color={isReady ? "white" : "rgba(255,255,255,0.5)"} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.skipButton, !isReady && styles.disabledButton]} onPress={() => skipTime(30)} disabled={!isReady}>
                                <MaterialIcons name="forward-30" size={36} color={isReady ? "white" : "rgba(255,255,255,0.5)"} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomControls}>
                        <View style={styles.timeContainer}>
                            <Text style={styles.timeText}>{formatTime(displayTime)}</Text>
                            <Text style={styles.timeText}>{formatTime(duration)}</Text>
                        </View>
                        <View style={styles.progressContainerWithMargin}>
                            <Slider
                                style={styles.progressSlider}
                                minimumValue={0}
                                maximumValue={1}
                                value={sliderValue}
                                onValueChange={handleSliderChange}
                                onSlidingStart={() => { setIsDragging(true); showControlsTemporarily(); }}
                                onSlidingComplete={handleSliderComplete}
                                minimumTrackTintColor="#007AFF"
                                maximumTrackTintColor="rgba(255,255,255,0.3)"
                                thumbTintColor="#fff"
                                thumbSize={20}
                                trackHeight={5}
                                enabled={isReady}
                            />
                        </View>
                        {playbackSpeed !== 1.0 && (
                            <View style={styles.bottomRightControls}>
                                <Text style={styles.speedText}>{playbackSpeed}x</Text>
                            </View>
                        )}
                    </LinearGradient>
                </Animated.View>
            )}

            {showContentFitLabel && (
                <Animated.View style={[styles.contentFitLabelContainer, { opacity: contentFitLabelOpacity }]} pointerEvents="none">
                    <Text style={styles.contentFitLabelText}>{contentFit.toUpperCase()}</Text>
                </Animated.View>
            )}
        </View>
    );
};