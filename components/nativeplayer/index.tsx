import React, { useEffect, useRef, useState, useCallback } from "react";
import { TouchableOpacity, Animated, Platform, Image } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { MenuView } from '@react-native-menu/menu';
import { WebMenu } from "@/components/WebMenuView";
import { styles } from "../coreplayer/styles";
import { MediaPlayerProps } from "../coreplayer/models";
import { playHaptic, formatTime } from "../coreplayer/utils";
import { usePlayerState, useSubtitleState, useUIState, usePlayerSettings, useTimers, usePlayerAnimations, hideControls, CONSTANTS, setupOrientation, cleanupOrientation, loadSubtitle, handleSubtitleError, findActiveSubtitle, calculateProgress, performSeek, buildSpeedActions, buildSubtitleActions, buildAudioActions, calculateSliderValues, ArtworkBackground, BufferingIndicator, SubtitleDisplay, BackButton, CenterControls, ProgressBar, ContentFitLabel, SubtitleSource } from "../coreplayer";
import { View, Text } from "../Themed";

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
    const shouldAutoHideControls = useRef(true);
    const isSeeking = useRef(false);

    // Use common hooks
    const playerState = usePlayerState();
    const subtitleState = useSubtitleState();
    const uiState = useUIState();
    const settings = usePlayerSettings();
    const timers = useTimers();
    const animations = usePlayerAnimations();

    // Local state
    const [loadingText, setLoadingText] = useState('Loading...');
    const [contentFit, setContentFit] = useState<'contain' | 'cover' | 'fill'>('cover');
    const [showContentFitLabel, setShowContentFitLabel] = useState(false);

    const useCustomSubtitles = subtitles.length > 0;

    // Initialize player
    const player = useVideoPlayer({
        uri: videoUrl,
        metadata: { title, artwork }
    }, (player) => {
        player.loop = false;
        player.muted = settings.isMuted;
        player.playbackRate = settings.playbackSpeed;
    });

    const showControlsTemporarily = useCallback(() => {
        uiState.setShowControls(true);
        Animated.timing(animations.controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

        timers.clearTimer('hideControls');

        if (playerState.isPlaying && shouldAutoHideControls.current) {
            timers.setTimer('hideControls', () => {
                hideControls(uiState.setShowControls, animations.controlsOpacity);
            }, CONSTANTS.CONTROLS_AUTO_HIDE_DELAY);
        }
    }, [playerState.isPlaying, animations.controlsOpacity, timers, uiState]);

    // Orientation and cleanup
    useEffect(() => {
        setupOrientation();
        return () => {
            cleanupOrientation();
            timers.clearAllTimers();
        };
    }, []);

    // Update player settings
    useEffect(() => {
        if (player) {
            player.muted = settings.isMuted;
            player.playbackRate = settings.playbackSpeed;
        }
    }, [player, settings.isMuted, settings.playbackSpeed]);

    // Load subtitles
    useEffect(() => {
        if (!useCustomSubtitles || settings.selectedSubtitle < 0 || settings.selectedSubtitle >= subtitles.length) {
            subtitleState.setParsedSubtitles([]);
            subtitleState.setCurrentSubtitle('');
            return;
        }

        const loadSub = async () => {
            subtitleState.setIsLoadingSubtitles(true);
            try {
                const parsed = await loadSubtitle(subtitles[settings.selectedSubtitle] as SubtitleSource, openSubtitlesClient);
                subtitleState.setParsedSubtitles(parsed);
            } catch (error: any) {
                handleSubtitleError(error);
                subtitleState.setParsedSubtitles([]);
            } finally {
                subtitleState.setIsLoadingSubtitles(false);
                subtitleState.setCurrentSubtitle('');
            }
        };

        loadSub();
    }, [settings.selectedSubtitle, subtitles, openSubtitlesClient, useCustomSubtitles]);

    // Update subtitle display
    useEffect(() => {
        if (subtitleState.parsedSubtitles.length === 0) return;

        const updateSubtitle = () => {
            const text = findActiveSubtitle(player.currentTime, subtitleState.parsedSubtitles);
            subtitleState.setCurrentSubtitle(text);
        };

        updateSubtitle();
        const interval = setInterval(updateSubtitle, CONSTANTS.SUBTITLE_UPDATE_INTERVAL);
        return () => clearInterval(interval);
    }, [subtitleState.parsedSubtitles, player]);

    // Player event handlers
    const playingChange = useEvent(player, "playingChange");
    useEffect(() => {
        if (!playingChange) return;
        playerState.setIsPlaying(playingChange.isPlaying);
        if (playingChange.isPlaying) {
            playerState.setIsBuffering(false);
            Animated.timing(animations.bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
    }, [playingChange]);

    const timeUpdate = useEvent(player, "timeUpdate");
    useEffect(() => {
        if (!timeUpdate || playerState.isDragging) return;

        playerState.setCurrentTime(timeUpdate.currentTime);
        const videoDuration = player.duration || 0;

        if (videoDuration > 0) {
            playerState.setDuration(videoDuration);
        }
    }, [timeUpdate, playerState.isDragging]);

    // Additional polling effect to ensure time updates
    useEffect(() => {
        if (!player || !playerState.isPlaying || playerState.isDragging || isSeeking.current) return;

        const pollInterval = setInterval(() => {
            if (!isSeeking.current && player.currentTime !== undefined) {
                playerState.setCurrentTime(player.currentTime);
            }
            if (player.duration > 0 && playerState.duration === 0) {
                playerState.setDuration(player.duration);
            }
        }, 100);

        return () => clearInterval(pollInterval);
    }, [player, playerState.isPlaying, playerState.isDragging, playerState.duration]);

    useEffect(() => {
        if (!updateProgress || !playerState.isReady || playerState.duration <= 0) return;

        const progressInterval = setInterval(() => {
            if (player.currentTime !== undefined && playerState.duration > 0) {
                const progress = calculateProgress(player.currentTime, playerState.duration);
                updateProgress({ progress });
            }
        }, 60 * 1000);

        return () => clearInterval(progressInterval);
    }, [player, playerState.isReady, playerState.duration, updateProgress]);

    const statusChange = useEvent(player, "statusChange");
    useEffect(() => {
        if (!statusChange) return;

        const { status, error } = statusChange;
        if (error) console.log('Video error:', error.message);

        switch (status) {
            case "loading":
                if (!playerState.isReady) {
                    playerState.setIsBuffering(true);
                    Animated.timing(animations.bufferOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
                }
                break;

            case "readyToPlay":
                playerState.setIsBuffering(false);
                playerState.setIsReady(true);
                playerState.setDuration(player.duration || 0);
                Animated.timing(animations.bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
                player.play();
                break;

            case "error":
                if (!playerState.isReady) {
                    setLoadingText("Unable to load the video. Retrying with VLC...");
                }
                playerState.setIsBuffering(false);
                break;
        }
    }, [statusChange, playerState.isReady]);

    // Auto-hide controls when playback starts
    useEffect(() => {
        if (playerState.isPlaying && uiState.showControls && shouldAutoHideControls.current) {
            showControlsTemporarily();
        }
    }, [playerState.isPlaying, showControlsTemporarily]);

    const showContentFitLabelTemporarily = useCallback(() => {
        setShowContentFitLabel(true);
        Animated.timing(animations.contentFitLabelOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

        timers.clearTimer('contentFitLabel');
        timers.setTimer('contentFitLabel', () => {
            Animated.timing(animations.contentFitLabelOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
                .start(() => setShowContentFitLabel(false));
        }, CONSTANTS.CONTENT_FIT_LABEL_DELAY);
    }, [animations.contentFitLabelOpacity, timers]);

    // Control actions
    const togglePlayPause = useCallback(async () => {
        if (!playerState.isReady) return;
        await playHaptic();
        playerState.isPlaying ? player.pause() : player.play();
        showControlsTemporarily();
    }, [playerState.isPlaying, player, playerState.isReady, showControlsTemporarily]);

    const seekTo = useCallback((seconds: number) => {
        if (!playerState.isReady || playerState.duration <= 0) return;
        const clampedTime = performSeek(seconds, playerState.duration);
        isSeeking.current = true;
        player.currentTime = clampedTime;
        playerState.setCurrentTime(clampedTime);
        setTimeout(() => {
            isSeeking.current = false;
        }, 500);
        showControlsTemporarily();
    }, [playerState.duration, player, playerState.isReady, showControlsTemporarily]);

    const skipTime = useCallback(async (seconds: number) => {
        if (!playerState.isReady) return;
        await playHaptic();
        seekTo(playerState.currentTime + seconds);
    }, [playerState.currentTime, seekTo, playerState.isReady]);

    const cycleContentFit = useCallback(async () => {
        await playHaptic();
        const currentIndex = CONSTANTS.CONTENT_FIT_OPTIONS.indexOf(contentFit);
        setContentFit(CONSTANTS.CONTENT_FIT_OPTIONS[(currentIndex + 1) % CONSTANTS.CONTENT_FIT_OPTIONS.length]);
        showContentFitLabelTemporarily();
        showControlsTemporarily();
    }, [contentFit, showControlsTemporarily, showContentFitLabelTemporarily]);

    const handleOverlayPress = useCallback(() => {
        if (uiState.showControls) {
            hideControls(uiState.setShowControls, animations.controlsOpacity);
        } else {
            showControlsTemporarily();
        }
    }, [uiState.showControls, showControlsTemporarily, animations.controlsOpacity, uiState]);

    // Slider handlers
    const handleSliderChange = useCallback((value: number) => {
        if (!playerState.isReady || playerState.duration <= 0) return;
        playerState.setIsDragging(true);
        playerState.setDragPosition(value);
    }, [playerState.duration, playerState.isReady]);

    const handleSliderComplete = useCallback((value: number) => {
        if (playerState.isReady && playerState.duration > 0) {
            const newTime = value * playerState.duration;
            isSeeking.current = true;
            player.currentTime = newTime;
            playerState.setCurrentTime(newTime);
            setTimeout(() => {
                isSeeking.current = false;
            }, 500);
        }
        playerState.setIsDragging(false);
    }, [playerState.duration, player, playerState.isReady]);

    // Menu handlers
    const handleSpeedSelect = useCallback(async (speed: number) => {
        await playHaptic();
        settings.setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const handleSubtitleSelect = useCallback(async (index: number) => {
        await playHaptic();
        settings.setSelectedSubtitle(index);
        if (!useCustomSubtitles && index >= 0) {
            player.subtitleTrack = player.availableSubtitleTracks[index];
        } else if (!useCustomSubtitles && index === -1) {
            player.subtitleTrack = null;
        }
    }, [useCustomSubtitles, player, settings]);

    const handleAudioSelect = useCallback(async (index: number) => {
        await playHaptic();
        settings.setSelectedAudioTrack(index);
        player.audioTrack = player.availableAudioTracks[index];
    }, [player, settings]);

    // Render helpers
    const getContentFitIcon = (): "fit-screen" | "crop" | "fullscreen" => {
        const icons = { contain: 'fit-screen', cover: 'crop', fill: 'fullscreen' } as const;
        return icons[contentFit];
    };

    // Build menu actions
    const speedActions = buildSpeedActions(settings.playbackSpeed);
    const subtitleActions = buildSubtitleActions(subtitles as SubtitleSource[], settings.selectedSubtitle, useCustomSubtitles, player.availableSubtitleTracks);
    const audioActions = buildAudioActions(player.availableAudioTracks, settings.selectedAudioTrack);

    const { displayTime, sliderValue } = calculateSliderValues(
        playerState.isDragging,
        playerState.dragPosition,
        playerState.currentTime,
        playerState.duration
    );

    const handleBack = useCallback(async () => {
        await playHaptic();
        const progress = calculateProgress(playerState.currentTime, playerState.duration);
        updateProgress({ progress });
        onBack({ message: '', player: "native" });
    }, [playerState.currentTime, playerState.duration, updateProgress, onBack]);

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

            <ArtworkBackground
                artwork={artwork}
                isBuffering={playerState.isBuffering}
                hasStartedPlaying={playerState.isReady}
            />

            <BufferingIndicator
                isBuffering={playerState.isBuffering}
                hasStartedPlaying={playerState.isReady}
                opacity={animations.bufferOpacity}
            />

            <TouchableOpacity style={styles.touchArea} activeOpacity={1} onPress={handleOverlayPress} />

            <SubtitleDisplay subtitle={useCustomSubtitles ? subtitleState.currentSubtitle : ''} />

            {!playerState.isReady && <BackButton onPress={handleBack} persistent />}

            {uiState.showControls && (
                <Animated.View style={[styles.controlsOverlay, { opacity: animations.controlsOpacity }]} pointerEvents="box-none">
                    <View style={styles.topControls}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                        </View>

                        <View style={styles.topRightControls}>
                            {switchMediaPlayer && Platform.OS !== 'web' && (
                                <TouchableOpacity style={styles.controlButton} onPress={async () => {
                                    await playHaptic();
                                    const progress = calculateProgress(playerState.currentTime, playerState.duration);
                                    switchMediaPlayer({ message: '', player: "native", progress });
                                }}>
                                    <MaterialCommunityIcons name="vlc" size={24} color="white" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.controlButton} onPress={async () => {
                                await playHaptic();
                                settings.setIsMuted(!settings.isMuted);
                                showControlsTemporarily();
                            }}>
                                <Ionicons name={settings.isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
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
                                        timers.clearTimer('hideControls');
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
                                        timers.clearTimer('hideControls');
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
                                    timers.clearTimer('hideControls');
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
                    </View>

                    <CenterControls
                        isPlaying={playerState.isPlaying}
                        isReady={playerState.isReady}
                        isBuffering={playerState.isBuffering}
                        onPlayPause={togglePlayPause}
                        onSkipBackward={() => skipTime(-10)}
                        onSkipForward={() => skipTime(30)}
                    />

                    <View style={styles.bottomControls}>
                        <ProgressBar
                            currentTime={displayTime}
                            duration={playerState.duration}
                            sliderValue={sliderValue}
                            isReady={playerState.isReady}
                            onValueChange={handleSliderChange}
                            onSlidingStart={() => {
                                playerState.setIsDragging(true);
                                showControlsTemporarily();
                            }}
                            onSlidingComplete={handleSliderComplete}
                            showSpeed={settings.playbackSpeed !== 1.0}
                            playbackSpeed={settings.playbackSpeed}
                        />
                    </View>
                </Animated.View>
            )}

            <ContentFitLabel
                show={showContentFitLabel}
                contentFit={contentFit}
                opacity={animations.contentFitLabelOpacity}
            />
        </View>
    );
};