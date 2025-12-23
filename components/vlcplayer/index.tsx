import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TouchableOpacity, Animated, Platform } from "react-native";
import { VLCPlayer } from 'react-native-vlc-media-player';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { MenuComponentRef, MenuView } from '@react-native-menu/menu';
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
    CONSTANTS,
    ErrorDisplay,
    findActiveSubtitle,
    handleSubtitleError,
    hideControls,
    loadSubtitle,
    performSeek,
    ProgressBar,
    SubtitleDisplay,
    SubtitleSource,
    usePlayerAnimations,
    usePlayerSettings,
    usePlayerState,
    useSubtitleState,
    useTimers,
    useUIState,
    ExtendedMediaPlayerProps,
    buildStreamActions
} from "../coreplayer";

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

// Helper function to build stream actions for MenuView

const VlcMediaPlayerComponent: React.FC<ExtendedMediaPlayerProps> = ({
    videoUrl,
    title,
    back: onBack,
    progress,
    artwork,
    subtitles = [],
    openSubtitlesClient,
    updateProgress,
    streams = [],
    currentStreamIndex = 0,
    onStreamChange
}) => {
    const playerRef = useRef<VLCPlayer>(null);
    const shouldAutoHideControls = useRef(true);
    const isSeeking = useRef(false);
    const progressUpdateTimerRef = useRef<NodeJS.Timeout | null | any>(null);
    const subtitleIntervalRef = useRef<NodeJS.Timeout | null | any>(null);
    const lastProgressUpdateRef = useRef(0);

    const playerState = useVLCPlayerState();
    const subtitleState = useSubtitleState();
    const uiState = useUIState();
    const settings = usePlayerSettings();
    const timers = useTimers();
    const animations = usePlayerAnimations();

    const [zoom, setZoom] = useState(1.0);

    const audioMenuRef = useRef<MenuComponentRef>(null);
    const subtitleMenuRef = useRef<MenuComponentRef>(null);
    const speedMenuRef = useRef<MenuComponentRef>(null);
    const streamMenuRef = useRef<MenuComponentRef>(null);

    const stateRefs = useRef({
        isPlaying: false,
        isReady: false,
        isDragging: false,
        currentTime: 0,
        duration: 0,
        isPaused: false
    });

    const progressBarValue = useRef(new Animated.Value(0)).current;

    // Batch state ref updates
    useEffect(() => {
        stateRefs.current = {
            isPlaying: playerState.isPlaying,
            isReady: playerState.isReady,
            isDragging: playerState.isDragging,
            currentTime: playerState.currentTime,
            duration: playerState.duration,
            isPaused: playerState.isPaused
        };
    }, [
        playerState.isPlaying,
        playerState.isReady,
        playerState.isDragging,
        playerState.currentTime,
        playerState.duration,
        playerState.isPaused
    ]);

    const showControlsTemporarily = useCallback(() => {
        uiState.setShowControls(true);
        Animated.timing(animations.controlsOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true
        }).start();

        timers.clearTimer('hideControls');

        if (playerState.isPlaying && !playerState.isBuffering && shouldAutoHideControls.current) {
            timers.setTimer('hideControls', () => {
                hideControls(uiState.setShowControls, animations.controlsOpacity);
            }, CONSTANTS.CONTROLS_AUTO_HIDE_DELAY);
        }
    }, [playerState.isPlaying, playerState.isBuffering, animations.controlsOpacity, timers, uiState]);   

    // Cleanup on unmount
    useEffect(() => {
        if (Platform.OS === "android") {
            ImmersiveMode.fullLayout(true);
        }
        return () => {
            if (updateProgress) {
                const progress = calculateProgress(playerState.currentTime, playerState.duration);
                updateProgress({ progress });
            }
            timers.clearAllTimers();

            // Clear all intervals
            if (progressUpdateTimerRef.current) {
                clearInterval(progressUpdateTimerRef.current);
                progressUpdateTimerRef.current = null;
            }
            if (subtitleIntervalRef.current) {
                clearInterval(subtitleIntervalRef.current);
                subtitleIntervalRef.current = null;
            }

            if (Platform.OS === "android") {
                ImmersiveMode.fullLayout(false);
            }
        };
    }, []);

    useEffect(() => {
        if (playerState.isPlaying && !playerState.isBuffering && uiState.showControls && shouldAutoHideControls.current) {
            showControlsTemporarily();
        }
    }, [playerState.isPlaying, playerState.isBuffering]);

    // Optimized subtitle loading
    useEffect(() => {
        if (subtitles.length === 0 || settings.selectedSubtitle < 0 || settings.selectedSubtitle >= subtitles.length) {
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
    }, [settings.selectedSubtitle, subtitles]);

    // Optimized subtitle updates - only when playing and subtitles exist
    useEffect(() => {
        if (subtitleState.parsedSubtitles.length === 0 || !playerState.isPlaying) {
            // Clear interval if player is paused
            if (subtitleIntervalRef.current) {
                clearInterval(subtitleIntervalRef.current);
                subtitleIntervalRef.current = null;
            }
            return;
        }

        const updateSubtitle = () => {
            const text = findActiveSubtitle(playerState.currentTime, subtitleState.parsedSubtitles);
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
    }, [subtitleState.parsedSubtitles, playerState.isPlaying, playerState.currentTime]);

    // Memoize VLC handlers to prevent recreation
    const vlcHandlers = useMemo(() => ({
        onLoad: (data: any) => {
            console.log('VLC onLoad');
            console.log('progress', progress);

            // Batch state updates
            requestAnimationFrame(() => {
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

            // Clear seeking state and hide loader when progress updates after seek
            if (isSeeking.current) {
                isSeeking.current = false;
                playerState.setIsSeeking(false);
                playerState.setIsBuffering(false);

                // Hide buffer indicator
                Animated.timing(animations.bufferOpacity, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }).start();
            }

            if (stateRefs.current.isDragging) return;

            // Throttle state updates
            const now = Date.now();
            if (now - lastProgressUpdateRef.current < 250) {
                // Update progress bar but skip state update
                if (stateRefs.current.duration > 0) {
                    const progress = newCurrentTime / stateRefs.current.duration;
                    progressBarValue.setValue(Math.max(0, Math.min(1, progress)));
                }
                return;
            }

            lastProgressUpdateRef.current = now;
            playerState.setCurrentTime(newCurrentTime);

            if (playerState.duration === 0 && dur > 0) {
                playerState.setDuration(dur / 1000);
            }

            if (stateRefs.current.duration > 0) {
                const progress = newCurrentTime / stateRefs.current.duration;
                progressBarValue.setValue(Math.max(0, Math.min(1, progress)));
            }
        },

        onBuffering: (data: any) => {
            const { isBuffering: buffering } = data;

            if (buffering && stateRefs.current.isReady) {
                requestAnimationFrame(() => {
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
            console.log('VLC onPlaying event');
            requestAnimationFrame(() => {
                playerState.setIsPlaying(true);
                playerState.setIsPaused(false);
                playerState.setIsBuffering(false);
                playerState.setShowBufferingLoader(false);
                isSeeking.current = false;
            });

            Animated.timing(animations.bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        },

        onPaused: () => {
            console.log('VLC onPaused event');
            requestAnimationFrame(() => {
                playerState.setIsPlaying(false);
                playerState.setIsPaused(true);
            });
        },

        onStopped: () => {
            console.log('VLC onStopped event');
            requestAnimationFrame(() => {
                playerState.setIsPlaying(false);
                playerState.setIsPaused(false);
            });
        },

        onEnd: () => {
            console.log('VLC onEnd event');
            requestAnimationFrame(() => {
                playerState.setIsPlaying(false);
                playerState.setIsPaused(false);
            });
        },

        onError: (error: any) => {
            console.error('VLC error:', error);
            let errorMessage = "Unable to load the video.";
            if (error?.error) {
                errorMessage = `Unable to load the video. ${error.error}`;
            }

            requestAnimationFrame(() => {
                playerState.setError(errorMessage);
                playerState.setIsBuffering(false);
                playerState.setIsReady(false);
                playerState.setShowBufferingLoader(false);
            });
        }
    }), [playerState, animations.bufferOpacity, progressBarValue]);

    // Progress update
    useEffect(() => {
        if (!updateProgress || !playerState.isReady || playerState.duration <= 0) {
            if (progressUpdateTimerRef.current) {
                clearInterval(progressUpdateTimerRef.current);
                progressUpdateTimerRef.current = null;
            }
            return;
        }

        progressUpdateTimerRef.current = setInterval(() => {
            if (playerState.currentTime !== undefined && playerState.duration > 0) {
                const progress = calculateProgress(playerState.currentTime, playerState.duration);
                updateProgress({ progress });
            }
        }, 10 * 60 * 1000);

        return () => {
            if (progressUpdateTimerRef.current) {
                clearInterval(progressUpdateTimerRef.current);
                progressUpdateTimerRef.current = null;
            }
        };
    }, [playerState.isReady, playerState.duration]);

    // Optimized control auto-hide
    useEffect(() => {
        if (playerState.isPlaying && uiState.showControls && shouldAutoHideControls.current) {
            showControlsTemporarily();
        }
    }, [playerState.isPlaying]);

    const handleZoomIn = useCallback(async () => {
        await playHaptic();
        setZoom(prev => {
            const newZoom = Math.min(prev + 0.05, 1.5);
            return Math.round(newZoom * 100) / 100;
        });
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleZoomOut = useCallback(async () => {
        await playHaptic();
        setZoom(prev => {
            const newZoom = Math.max(prev - 0.05, 1.0);
            return Math.round(newZoom * 100) / 100;
        });
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const togglePlayPause = useCallback(async () => {
        if (!playerState.isReady) return;

        await playHaptic();

        const newPausedState = !playerState.isPaused;

        playerState.setIsPaused(newPausedState);
        playerState.setIsPlaying(!newPausedState);

        showControlsTemporarily();
    }, [playerState.isReady, playerState.isPaused, playerState, showControlsTemporarily]);

    const seekTo = useCallback((seconds: number) => {
        if (!playerRef.current || playerState.duration <= 0) return;
        const clampedTime = performSeek(seconds, playerState.duration);
        const position = clampedTime / playerState.duration;

        // Set seeking state and show buffering immediately
        isSeeking.current = true;
        playerState.setIsSeeking(true);
        playerState.setIsBuffering(true);
        playerState.setCurrentTime(clampedTime);
        progressBarValue.setValue(position);

        // Show buffer indicator immediately
        Animated.timing(animations.bufferOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();

        playerRef.current?.seek(position);
        showControlsTemporarily();
    }, [playerState, showControlsTemporarily, progressBarValue, animations.bufferOpacity]);

    const skipTime = useCallback(async (seconds: number) => {
        if (!playerState.isReady) return;
        await playHaptic();
        seekTo(playerState.currentTime + seconds);
    }, [playerState.currentTime, seekTo, playerState.isReady]);

    const handleOverlayPress = useCallback(() => {
        if (uiState.showControls) {
            hideControls(uiState.setShowControls, animations.controlsOpacity);
        } else {
            showControlsTemporarily();
        }
    }, [uiState.showControls, showControlsTemporarily, animations.controlsOpacity, uiState]);

    const handleSliderChange = useCallback((value: number) => {
        if (!playerState.isReady || playerState.duration <= 0) return;
        playerState.setIsDragging(true);
        playerState.setDragPosition(value);
        progressBarValue.setValue(value);
    }, [playerState.duration, playerState.isReady, progressBarValue, playerState]);

    const handleSliderComplete = useCallback((value: number) => {
        if (playerState.isReady && playerState.duration > 0) {
            const newTime = value * playerState.duration;
            seekTo(newTime);
        }
        playerState.setIsDragging(false);
    }, [playerState.duration, playerState.isReady, seekTo, playerState]);

    const handleSpeedSelect = useCallback(async (speed: number) => {
        await playHaptic();
        settings.setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const handleSubtitleSelect = useCallback(async (index: number) => {
        await playHaptic();
        settings.setSelectedSubtitle(index);
    }, [settings]);

    const handleAudioSelect = useCallback(async (index: number) => {
        await playHaptic();
        settings.setSelectedAudioTrack(index);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const handleStreamSelect = useCallback(async (index: number) => {
        await playHaptic();
        if (onStreamChange) {
            onStreamChange(index);
        }
        showControlsTemporarily();
    }, [onStreamChange, showControlsTemporarily]);

    // Memoize action builders
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

    const streamActions = useMemo(() =>
        buildStreamActions(streams, currentStreamIndex),
        [streams, currentStreamIndex]
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

    const handleBack = useCallback(async () => {
        await playHaptic();
        const progress = calculateProgress(playerState.currentTime, playerState.duration);
        onBack({ message: '', progress, player: "vlc" });
    }, [playerState.currentTime, playerState.duration, onBack]);

    return (
        <View style={styles.container}>
            {!playerState.error && (
                <VLCPlayer
                    ref={playerRef}
                    style={[styles.video, {
                        transform: [{ scale: zoom }]
                    }]}
                    source={{
                        uri: videoUrl,
                        initType: 2,
                        initOptions: [
                            '--no-sub-autodetect-file',
                            '--no-spu'
                        ]
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

            <TouchableOpacity style={styles.touchArea} activeOpacity={1} onPress={handleOverlayPress} />

            <SubtitleDisplay subtitle={subtitleState.currentSubtitle} error={!!playerState.error} />

            {uiState.showControls && !playerState.error && (
                <Animated.View style={[styles.controlsOverlay, { opacity: animations.controlsOpacity }]} pointerEvents="box-none">
                    <View style={styles.topControls}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                        </View>

                        <View style={styles.topRightControls}>
                            {/* Stream Selector - Only show if streams are available */}
                            {streams.length > 1 && (
                                <MenuView
                                    ref={streamMenuRef}
                                    title="Select Stream"
                                    onPressAction={({ nativeEvent }) => {
                                        const index = parseInt(nativeEvent.event.split('-')[1]);
                                        if (!isNaN(index)) handleStreamSelect(index);
                                    }}
                                    actions={streamActions}
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
                                    <TouchableOpacity
                                        style={styles.controlButton}
                                        onPress={() => {
                                            if (Platform.OS === 'android') {
                                                streamMenuRef.current?.show();
                                            }
                                        }}
                                    >
                                        <MaterialIcons name="ondemand-video" size={24} color="#ffffff" />
                                    </TouchableOpacity>
                                </MenuView>
                            )}

                            <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut}>
                                <MaterialIcons name="zoom-out" size={24} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn}>
                                <MaterialIcons name="zoom-in" size={24} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.controlButton} onPress={async () => {
                                await playHaptic();
                                settings.setIsMuted(!settings.isMuted);
                                showControlsTemporarily();
                            }}>
                                <Ionicons name={settings.isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
                            </TouchableOpacity>

                            {playerState.availableAudioTracks.length > 0 && (
                                <MenuView
                                    ref={audioMenuRef}
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
                                    <TouchableOpacity
                                        style={styles.controlButton}
                                        onPress={() => {
                                            if (Platform.OS === 'android') {
                                                audioMenuRef.current?.show();
                                            }
                                        }}
                                    >
                                        <MaterialIcons name="multitrack-audio" size={24} color="white" />
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
                                    <TouchableOpacity
                                        style={styles.controlButton}
                                        onPress={() => {
                                            if (Platform.OS === 'android') {
                                                subtitleMenuRef.current?.show();
                                            }
                                        }}
                                    >
                                        <MaterialIcons name="closed-caption" size={24} color="white" />
                                    </TouchableOpacity>
                                </MenuView>
                            )}

                            <MenuView
                                ref={speedMenuRef}
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
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={() => {
                                        if (Platform.OS === 'android') {
                                            speedMenuRef.current?.show();
                                        }
                                    }}
                                >
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
                        onSkipForward={() => skipTime(10)}
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