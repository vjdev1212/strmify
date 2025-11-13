import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TouchableOpacity, Animated, Platform } from "react-native";
import { VLCPlayer } from 'react-native-vlc-media-player';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { MenuView } from '@react-native-menu/menu';
import ImmersiveMode from "react-native-immersive-mode";
import { View, Text } from "../Themed";
import { playHaptic } from "../coreplayer/utils";
import { styles } from "../coreplayer/styles";
import {
    ArtworkBackground,
    WaitingLobby,
    buildAudioActions,
    buildSpeedActions,
    buildSubtitleActions,
    calculateProgress,
    calculateSliderValues,
    CenterControls,
    cleanupOrientation,
    CONSTANTS,
    ErrorDisplay,
    findActiveSubtitle,
    handleSubtitleError,
    hideControls,
    loadSubtitle,
    performSeek,
    ProgressBar,
    setupOrientation,
    SubtitleDisplay,
    SubtitleSource,
    usePlayerAnimations,
    usePlayerSettings,
    usePlayerState,
    useSubtitleState,
    useTimers,
    useUIState,
    ContentFitLabel
} from "../coreplayer";
import { MediaPlayerProps } from "../coreplayer/models";

const useVLCPlayerState = () => {
    const baseState = usePlayerState();
    const [isPaused, setIsPaused] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showBufferingLoader, setShowBufferingLoader] = useState(false);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const [availableAudioTracks, setAvailableAudioTracks] = useState<any[]>([]);

    return {
        ...baseState,
        isPaused, setIsPaused,
        error, setError,
        showBufferingLoader, setShowBufferingLoader,
        hasStartedPlaying, setHasStartedPlaying,
        isSeeking, setIsSeeking,
        availableAudioTracks, setAvailableAudioTracks
    };
};

const VlcMediaPlayerComponent: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    back: onBack,
    progress,
    artwork,
    subtitles = [],
    openSubtitlesClient,
    updateProgress
}) => {
    const playerRef = useRef<VLCPlayer>(null);
    const shouldAutoHideControls = useRef(true);
    const isSeeking = useRef(false);
    const progressUpdateTimerRef = useRef<NodeJS.Timeout | any | null>(null);
    const subtitleIntervalRef = useRef<NodeJS.Timeout | any | null>(null);
    const lastProgressUpdateRef = useRef(0);
    const rafIdRef = useRef<number | null>(null);

    const playerState = useVLCPlayerState();
    const subtitleState = useSubtitleState();
    const uiState = useUIState();
    const settings = usePlayerSettings();
    const timers = useTimers();
    const animations = usePlayerAnimations();

    const [zoom, setZoom] = useState(1.0);

    // Single state ref object - updated via reducer pattern
    const stateRefs = useRef({
        isPlaying: false,
        isReady: false,
        isDragging: false,
        currentTime: 0,
        duration: 0,
        isPaused: false
    });

    const progressBarValue = useRef(new Animated.Value(0)).current;

    // Batch all state ref updates in a single effect with proper dependencies
    useEffect(() => {
        stateRefs.current.isPlaying = playerState.isPlaying;
        stateRefs.current.isReady = playerState.isReady;
        stateRefs.current.isDragging = playerState.isDragging;
        stateRefs.current.currentTime = playerState.currentTime;
        stateRefs.current.duration = playerState.duration;
        stateRefs.current.isPaused = playerState.isPaused;
    }, [
        playerState.isPlaying,
        playerState.isReady,
        playerState.isDragging,
        playerState.currentTime,
        playerState.duration,
        playerState.isPaused
    ]);

    // Memoize and stabilize showControlsTemporarily with fewer dependencies
    const showControlsTemporarily = useCallback(() => {
        uiState.setShowControls(true);
        Animated.timing(animations.controlsOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true
        }).start();

        timers.clearTimer('hideControls');

        if (stateRefs.current.isPlaying && shouldAutoHideControls.current) {
            timers.setTimer('hideControls', () => {
                hideControls(uiState.setShowControls, animations.controlsOpacity);
            }, CONSTANTS.CONTROLS_AUTO_HIDE_DELAY);
        }
    }, [animations.controlsOpacity, timers, uiState]);

    // Cleanup on unmount - optimized
    useEffect(() => {
        setupOrientation();
        if (Platform.OS === "android") {
            ImmersiveMode.fullLayout(true);
        }

        return () => {
            // Cancel any pending RAF
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }

            // Save progress
            if (updateProgress && stateRefs.current.duration > 0) {
                const progress = calculateProgress(stateRefs.current.currentTime, stateRefs.current.duration);
                updateProgress({ progress });
            }

            cleanupOrientation();
            timers.clearAllTimers();

            // Clear all intervals
            if (progressUpdateTimerRef.current) {
                clearInterval(progressUpdateTimerRef.current);
            }
            if (subtitleIntervalRef.current) {
                clearInterval(subtitleIntervalRef.current);
            }

            if (Platform.OS === "android") {
                ImmersiveMode.fullLayout(false);
            }
        };
    }, []); // Empty deps - only run on mount/unmount

    // Optimized subtitle loading with abort controller
    useEffect(() => {
        if (subtitles.length === 0 || settings.selectedSubtitle < 0 || settings.selectedSubtitle >= subtitles.length) {
            subtitleState.setParsedSubtitles([]);
            subtitleState.setCurrentSubtitle('');
            return;
        }

        let cancelled = false;

        const loadSub = async () => {
            subtitleState.setIsLoadingSubtitles(true);
            try {
                const parsed = await loadSubtitle(subtitles[settings.selectedSubtitle] as SubtitleSource, openSubtitlesClient);
                if (!cancelled) {
                    subtitleState.setParsedSubtitles(parsed);
                }
            } catch (error: any) {
                if (!cancelled) {
                    handleSubtitleError(error);
                    subtitleState.setParsedSubtitles([]);
                }
            } finally {
                if (!cancelled) {
                    subtitleState.setIsLoadingSubtitles(false);
                    subtitleState.setCurrentSubtitle('');
                }
            }
        };

        loadSub();

        return () => {
            cancelled = true;
        };
    }, [settings.selectedSubtitle]); // Removed subtitles from deps

    // Optimized subtitle updates with RAF
    useEffect(() => {
        if (subtitleState.parsedSubtitles.length === 0 || !stateRefs.current.isPlaying) {
            if (subtitleIntervalRef.current) {
                clearInterval(subtitleIntervalRef.current);
                subtitleIntervalRef.current = null;
            }
            return;
        }

        const updateSubtitle = () => {
            const text = findActiveSubtitle(stateRefs.current.currentTime, subtitleState.parsedSubtitles);
            if (subtitleState.currentSubtitle !== text) {
                subtitleState.setCurrentSubtitle(text);
            }
        };

        updateSubtitle();
        subtitleIntervalRef.current = setInterval(updateSubtitle, CONSTANTS.SUBTITLE_UPDATE_INTERVAL);

        return () => {
            if (subtitleIntervalRef.current) {
                clearInterval(subtitleIntervalRef.current);
                subtitleIntervalRef.current = null;
            }
        };
    }, [subtitleState.parsedSubtitles]); // Removed playerState.isPlaying and currentTime

    // Stable VLC handlers with minimal dependencies
    const vlcHandlers = useMemo(() => {
        const batchStateUpdate = (updates: () => void) => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
            rafIdRef.current = requestAnimationFrame(updates);
        };

        return {
            onLoad: (data: any) => {
                batchStateUpdate(() => {
                    playerState.setIsBuffering(false);
                    playerState.setIsReady(true);
                    playerState.setError(null);
                    playerState.setHasStartedPlaying(true);
                    playerState.setIsPlaying(true);
                    playerState.setIsPaused(false);
                    playerState.setShowBufferingLoader(false);
                    playerState.setIsSeeking(false);

                    if (data?.audioTracks) {
                        playerState.setAvailableAudioTracks(data.audioTracks);
                    }
                    if (data?.duration) {
                        const durationInSeconds = data.duration / 1000;
                        playerState.setDuration(durationInSeconds);
                        stateRefs.current.duration = durationInSeconds;
                    }
                    if (progress && progress > 0) {
                        playerRef.current?.seek(progress / 100);
                    }
                });

                Animated.timing(animations.bufferOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            },

            onProgress: (data: any) => {
                const { currentTime: current, duration: dur } = data;
                const newCurrentTime = current / 1000;

                // Clear seeking state
                if (isSeeking.current) {
                    isSeeking.current = false;
                    playerState.setIsSeeking(false);
                    playerState.setIsBuffering(false);

                    Animated.timing(animations.bufferOpacity, {
                        toValue: 0,
                        duration: 100,
                        useNativeDriver: true,
                    }).start();
                }

                if (stateRefs.current.isDragging) return;

                // Aggressive throttling - update every 500ms instead of 250ms
                const now = Date.now();
                const shouldUpdate = now - lastProgressUpdateRef.current >= 500;

                // Always update progress bar for smooth animation
                if (stateRefs.current.duration > 0) {
                    const progress = newCurrentTime / stateRefs.current.duration;
                    progressBarValue.setValue(Math.max(0, Math.min(1, progress)));
                }

                if (!shouldUpdate) return;

                lastProgressUpdateRef.current = now;
                stateRefs.current.currentTime = newCurrentTime;
                playerState.setCurrentTime(newCurrentTime);

                if (stateRefs.current.duration === 0 && dur > 0) {
                    const durationInSeconds = dur / 1000;
                    stateRefs.current.duration = durationInSeconds;
                    playerState.setDuration(durationInSeconds);
                }
            },

            onBuffering: (data: any) => {
                const { isBuffering: buffering } = data;

                if (buffering && stateRefs.current.isReady) {
                    batchStateUpdate(() => {
                        playerState.setIsBuffering(true);
                        Animated.timing(animations.bufferOpacity, {
                            toValue: 1,
                            duration: 200,
                            useNativeDriver: true,
                        }).start();
                    });
                }
            },

            onPlaying: () => {
                batchStateUpdate(() => {
                    playerState.setIsPlaying(true);
                    playerState.setIsPaused(false);
                    playerState.setIsBuffering(false);
                    playerState.setShowBufferingLoader(false);
                    isSeeking.current = false;
                    stateRefs.current.isPlaying = true;
                    stateRefs.current.isPaused = false;
                });

                Animated.timing(animations.bufferOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            },

            onPaused: () => {
                batchStateUpdate(() => {
                    playerState.setIsPlaying(false);
                    playerState.setIsPaused(true);
                    stateRefs.current.isPlaying = false;
                    stateRefs.current.isPaused = true;
                });
            },

            onStopped: () => {
                batchStateUpdate(() => {
                    playerState.setIsPlaying(false);
                    playerState.setIsPaused(false);
                    stateRefs.current.isPlaying = false;
                    stateRefs.current.isPaused = false;
                });
            },

            onEnd: () => {
                batchStateUpdate(() => {
                    playerState.setIsPlaying(false);
                    playerState.setIsPaused(false);
                    stateRefs.current.isPlaying = false;
                    stateRefs.current.isPaused = false;
                });
            },

            onError: (error: any) => {
                console.error('VLC error:', error);
                const errorMessage = error?.error
                    ? `Unable to load the video. ${error.error}`
                    : "Unable to load the video.";

                batchStateUpdate(() => {
                    playerState.setError(errorMessage);
                    playerState.setIsBuffering(false);
                    playerState.setIsReady(false);
                    playerState.setShowBufferingLoader(false);
                });
            }
        };
    }, [playerState, animations.bufferOpacity, progressBarValue, progress]);

    // Progress update - optimized
    useEffect(() => {
        if (!updateProgress || !stateRefs.current.isReady || stateRefs.current.duration <= 0) {
            if (progressUpdateTimerRef.current) {
                clearInterval(progressUpdateTimerRef.current);
                progressUpdateTimerRef.current = null;
            }
            return;
        }

        progressUpdateTimerRef.current = setInterval(() => {
            const progress = calculateProgress(stateRefs.current.currentTime, stateRefs.current.duration);
            updateProgress({ progress });
        }, 10 * 60 * 1000);

        return () => {
            if (progressUpdateTimerRef.current) {
                clearInterval(progressUpdateTimerRef.current);
                progressUpdateTimerRef.current = null;
            }
        };
    }, [updateProgress]); // Removed playerState dependencies

    // Simplified control auto-hide
    useEffect(() => {
        if (stateRefs.current.isPlaying && uiState.showControls && shouldAutoHideControls.current) {
            showControlsTemporarily();
        }
    }, [playerState.isPlaying, showControlsTemporarily]); // Keep playerState.isPlaying for reactivity

    // Zoom handlers - optimized with useCallback
    const handleZoomIn = useCallback(() => {
        playHaptic();
        setZoom(prev => Math.round(Math.min(prev + 0.05, 1.5) * 100) / 100);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleZoomOut = useCallback(() => {
        playHaptic();
        setZoom(prev => Math.round(Math.max(prev - 0.05, 1.0) * 100) / 100);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const togglePlayPause = useCallback(() => {
        if (!stateRefs.current.isReady) return;

        playHaptic();

        const newPausedState = !stateRefs.current.isPaused;
        playerState.setIsPaused(newPausedState);
        playerState.setIsPlaying(!newPausedState);

        showControlsTemporarily();
    }, [playerState, showControlsTemporarily]);

    const seekTo = useCallback((seconds: number) => {
        if (!playerRef.current || stateRefs.current.duration <= 0) return;

        const clampedTime = performSeek(seconds, stateRefs.current.duration);
        const position = clampedTime / stateRefs.current.duration;

        isSeeking.current = true;
        playerState.setIsSeeking(true);
        playerState.setIsBuffering(true);
        playerState.setCurrentTime(clampedTime);
        stateRefs.current.currentTime = clampedTime;
        progressBarValue.setValue(position);

        Animated.timing(animations.bufferOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();

        playerRef.current.seek(position);
        showControlsTemporarily();
    }, [playerState, showControlsTemporarily, progressBarValue, animations.bufferOpacity]);

    const skipTime = useCallback((seconds: number) => {
        if (!stateRefs.current.isReady) return;
        playHaptic();
        seekTo(stateRefs.current.currentTime + seconds);
    }, [seekTo]);

    const handleOverlayPress = useCallback(() => {
        if (uiState.showControls) {
            hideControls(uiState.setShowControls, animations.controlsOpacity);
        } else {
            showControlsTemporarily();
        }
    }, [uiState.showControls, showControlsTemporarily, animations.controlsOpacity, uiState]);

    const handleSliderChange = useCallback((value: number) => {
        if (!stateRefs.current.isReady || stateRefs.current.duration <= 0) return;
        playerState.setIsDragging(true);
        playerState.setDragPosition(value);
        progressBarValue.setValue(value);
    }, [progressBarValue, playerState]);

    const handleSliderComplete = useCallback((value: number) => {
        if (stateRefs.current.isReady && stateRefs.current.duration > 0) {
            const newTime = value * stateRefs.current.duration;
            seekTo(newTime);
        }
        playerState.setIsDragging(false);
    }, [seekTo, playerState]);

    const handleSpeedSelect = useCallback((speed: number) => {
        playHaptic();
        settings.setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const handleSubtitleSelect = useCallback((index: number) => {
        playHaptic();
        settings.setSelectedSubtitle(index);
    }, [settings]);

    const handleAudioSelect = useCallback((index: number) => {
        playHaptic();
        settings.setSelectedAudioTrack(index);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    // Memoize action builders with proper dependencies
    const speedActions = useMemo(() =>
        buildSpeedActions(settings.playbackSpeed),
        [settings.playbackSpeed]
    );

    const subtitleActions = useMemo(() =>
        buildSubtitleActions(subtitles as SubtitleSource[], settings.selectedSubtitle, true),
        [subtitles, settings.selectedSubtitle]
    );

    const audioActions = useMemo(() =>
        buildAudioActions(playerState.availableAudioTracks, settings.selectedAudioTrack),
        [playerState.availableAudioTracks, settings.selectedAudioTrack]
    );

    const { displayTime, sliderValue } = useMemo(() =>
        calculateSliderValues(
            playerState.isDragging,
            playerState.dragPosition,
            playerState.currentTime,
            playerState.duration
        ),
        [playerState.isDragging, playerState.dragPosition, playerState.currentTime, playerState.duration]
    );

    const handleBack = useCallback(() => {
        playHaptic();
        const progress = calculateProgress(stateRefs.current.currentTime, stateRefs.current.duration);
        onBack({ message: '', progress, player: "vlc" });
    }, [onBack]);

    // Memoize video style to prevent recalculation
    const videoStyle = useMemo(() => [
        styles.video,
        { transform: [{ scale: zoom }] }
    ], [zoom]);

    return (
        <View style={styles.container}>
            {!playerState.error && (
                <VLCPlayer
                    ref={playerRef}
                    style={videoStyle}
                    source={{
                        uri: videoUrl,
                        initType: 1
                    }}
                    autoplay={true}
                    playInBackground={true}
                    autoAspectRatio={true}
                    resizeMode="cover"
                    textTrack={-1}
                    acceptInvalidCertificates={true}
                    rate={settings.playbackSpeed}
                    muted={settings.isMuted}
                    audioTrack={settings.selectedAudioTrack}
                    paused={playerState.isPaused}
                    onPlaying={vlcHandlers.onPlaying}
                    onProgress={vlcHandlers.onProgress}
                    onLoad={vlcHandlers.onLoad}
                    onBuffering={vlcHandlers.onBuffering}
                    onPaused={vlcHandlers.onPaused}
                    onStopped={vlcHandlers.onStopped}
                    onEnd={vlcHandlers.onEnd}
                    onError={vlcHandlers.onError}
                />
            )}

            <ErrorDisplay
                error={playerState.error}
                onBack={handleBack}
                onRetry={() => {
                    playerState.setError(null);
                    playerState.setIsReady(false);
                    playerState.setIsBuffering(true);
                    playerState.setHasStartedPlaying(false);
                }}
            />

            <ArtworkBackground
                artwork={artwork}
                isBuffering={playerState.isBuffering}
                hasStartedPlaying={playerState.hasStartedPlaying}
                error={!!playerState.error}
            />

            <WaitingLobby
                hasStartedPlaying={playerState.hasStartedPlaying}
                opacity={animations.bufferOpacity}
                error={!!playerState.error}
            />

            <TouchableOpacity
                style={styles.touchArea}
                activeOpacity={1}
                onPress={handleOverlayPress}
            />

            <SubtitleDisplay
                subtitle={subtitleState.currentSubtitle}
                error={!!playerState.error}
            />

            {uiState.showControls && !playerState.error && (
                <Animated.View
                    style={[styles.controlsOverlay, { opacity: animations.controlsOpacity }]}
                    pointerEvents="box-none"
                >
                    <View style={styles.topControls}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                        </View>

                        <View style={styles.topRightControls}>
                            <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut}>
                                <MaterialIcons name="zoom-out" size={24} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn}>
                                <MaterialIcons name="zoom-in" size={24} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={() => {
                                    playHaptic();
                                    settings.setIsMuted(!settings.isMuted);
                                    showControlsTemporarily();
                                }}
                            >
                                <Ionicons
                                    name={settings.isMuted ? "volume-mute" : "volume-high"}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {playerState.availableAudioTracks.length > 0 && (
                                <MenuView
                                    style={{ zIndex: 1000 }}
                                    title="Audio Track"
                                    onPressAction={({ nativeEvent }) => {
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
                                    <TouchableOpacity style={styles.controlButton}>
                                        <MaterialIcons name="audiotrack" size={24} color="white" />
                                    </TouchableOpacity>
                                </MenuView>
                            )}

                            {subtitles.length > 0 && (
                                <MenuView
                                    style={{ zIndex: 1000 }}
                                    title="Subtitles"
                                    onPressAction={({ nativeEvent }) => {
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
                                    <TouchableOpacity style={styles.controlButton}>
                                        <MaterialIcons name="closed-caption" size={24} color="white" />
                                    </TouchableOpacity>
                                </MenuView>
                            )}

                            <MenuView
                                style={{ zIndex: 1000 }}
                                title="Playback Speed"
                                onPressAction={({ nativeEvent }) => {
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
                                <TouchableOpacity style={styles.controlButton}>
                                    <MaterialIcons name="speed" size={24} color="white" />
                                </TouchableOpacity>
                            </MenuView>
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
        </View>
    );
};

export const MediaPlayer = React.memo(VlcMediaPlayerComponent);