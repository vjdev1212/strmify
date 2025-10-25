import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TouchableOpacity, Animated, Platform } from "react-native";
import { VLCPlayer } from 'react-native-vlc-media-player';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { MenuView } from '@react-native-menu/menu';
import ImmersiveMode from "react-native-immersive-mode";
import { View, Text } from "../Themed";
import { playHaptic } from "../coreplayer/utils";
import { styles } from "../coreplayer/styles";
import { ArtworkBackground, BackButton, BufferingIndicator, buildAudioActions, buildSpeedActions, buildSubtitleActions, calculateProgress, calculateSliderValues, CenterControls, cleanupOrientation, CONSTANTS, ErrorDisplay, findActiveSubtitle, handleSubtitleError, hideControls, loadSubtitle, performSeek, ProgressBar, SeekFeedback, setupOrientation, SubtitleDisplay, SubtitleSource, usePlayerAnimations, usePlayerSettings, usePlayerState, useSubtitleState, useTimers, useUIState } from "../coreplayer";
import { MediaPlayerProps } from "../coreplayer/models";

// Extended player state for VLC
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

// Gesture handling hook for double-tap seek
const useGestureHandling = (
    onSeekForward: (seconds: number) => void,
    onSeekBackward: (seconds: number) => void,
    onToggleControls: () => void,
    timers: any,
    isReady: boolean
) => {
    const lastTap = useRef<{ timestamp: number; side: 'left' | 'right' | null }>({
        timestamp: 0,
        side: null
    });

    const handleTouchablePress = useCallback((event: any) => {
        if (!isReady) return;

        const { locationX } = event.nativeEvent;
        const screenWidth = event.nativeEvent.target?.offsetWidth || 400;
        const currentTime = Date.now();
        const tapSide = locationX < screenWidth / 2 ? 'left' : 'right';

        if (currentTime - lastTap.current.timestamp < 300 && lastTap.current.side === tapSide) {
            timers.clearTimer('doubleTap');

            if (tapSide === 'left') {
                onSeekBackward(10);
            } else {
                onSeekForward(10);
            }

            lastTap.current = { timestamp: 0, side: null };
        } else {
            lastTap.current = { timestamp: currentTime, side: tapSide };

            timers.clearTimer('doubleTap');
            timers.setTimer('doubleTap', () => {
                onToggleControls();
                lastTap.current = { timestamp: 0, side: null };
            }, 300);
        }
    }, [isReady, onSeekForward, onSeekBackward, onToggleControls, timers]);

    return { handleTouchablePress };
};

const VlcMediaPlayerComponent: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    back,
    artwork,
    subtitles = [],
    openSubtitlesClient,
    updateProgress
}) => {
    const playerRef = useRef<VLCPlayer>(null);
    const playerState = useVLCPlayerState();
    const uiState = useUIState();
    const subtitleState = useSubtitleState();
    const settings = usePlayerSettings();
    const timers = useTimers();
    const animations = usePlayerAnimations();
    
    const [videoScale, setVideoScale] = useState({ x: 1.0, y: 1.0 });
    const [seekFeedback, setSeekFeedback] = useState<{
        show: boolean;
        direction: 'forward' | 'backward';
        seconds: number;
    }>({
        show: false,
        direction: 'forward',
        seconds: 10
    });

    const stateRefs = useRef({
        isPlaying: false,
        isReady: false,
        isDragging: false,
        isSeeking: false,
        currentTime: 0,
        duration: 0
    });

    // Update refs
    useEffect(() => { stateRefs.current.isPlaying = playerState.isPlaying; }, [playerState.isPlaying]);
    useEffect(() => { stateRefs.current.isReady = playerState.isReady; }, [playerState.isReady]);
    useEffect(() => { stateRefs.current.isDragging = playerState.isDragging; }, [playerState.isDragging]);
    useEffect(() => { stateRefs.current.isSeeking = playerState.isSeeking; }, [playerState.isSeeking]);
    useEffect(() => { stateRefs.current.currentTime = playerState.currentTime; }, [playerState.currentTime]);
    useEffect(() => { stateRefs.current.duration = playerState.duration; }, [playerState.duration]);

    const progressBarValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        setupOrientation();
        return () => {
            cleanupOrientation();
            timers.clearAllTimers();
        };
    }, []);

    useEffect(() => {
        if (Platform.OS === "android") {
            ImmersiveMode.fullLayout(true);
        }
        return () => {
            if (Platform.OS === "android") {
                ImmersiveMode.fullLayout(true);
            }
        };
    }, []);

    // Load subtitles
    useEffect(() => {
        if (subtitles.length > 0 && settings.selectedSubtitle >= 0 && settings.selectedSubtitle < subtitles.length) {
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
                }
            };
            loadSub();
        } else {
            subtitleState.setParsedSubtitles([]);
            subtitleState.setCurrentSubtitle('');
        }
    }, [settings.selectedSubtitle, subtitles, openSubtitlesClient]);

    // Update subtitle display
    useEffect(() => {
        const newSubtitle = findActiveSubtitle(playerState.currentTime, subtitleState.parsedSubtitles);
        if (newSubtitle !== subtitleState.currentSubtitle) {
            subtitleState.setCurrentSubtitle(newSubtitle);
        }
    }, [playerState.currentTime, subtitleState.parsedSubtitles]);

    const showControlsTemporarily = useCallback(() => {
        uiState.setShowControls(true);
        animations.controlsOpacity.setValue(1);

        timers.clearTimer('hideControls');

        if (!uiState.preventAutoHide) {
            timers.setTimer('hideControls', () => {
                hideControls(uiState.setShowControls, animations.controlsOpacity);
            }, CONSTANTS.CONTROLS_AUTO_HIDE_DELAY);
        }
    }, [animations.controlsOpacity, uiState.preventAutoHide, uiState.setShowControls, timers]);

    const vlcHandlers = useMemo(() => ({
        onLoad: (data: any) => {
            console.log('VLC Player loaded:', data);
            playerState.setIsBuffering(false);
            playerState.setIsReady(true);
            playerState.setError(null);
            playerState.setHasStartedPlaying(true);
            playerState.setIsPlaying(true);
            playerState.setShowBufferingLoader(false);
            playerState.setIsSeeking(false);
            animations.controlsOpacity.setValue(1);

            timers.clearTimer('hideControls');

            if (data?.audioTracks) {
                playerState.setAvailableAudioTracks(data.audioTracks);
            }
            if (data?.duration) {
                playerState.setDuration(data.duration / 1000);
            }

            Animated.timing(animations.bufferOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        },

        onProgress: (data: any) => {
            if (stateRefs.current.isDragging || stateRefs.current.isSeeking) return;

            timers.clearTimer('progressDebounce');
            timers.setTimer('progressDebounce', () => {
                const { currentTime: current, duration: dur } = data;
                const newCurrentTime = current / 1000;

                playerState.setCurrentTime(newCurrentTime);

                if (playerState.duration === 0 && dur > 0) {
                    playerState.setDuration(dur / 1000);
                }

                if (stateRefs.current.duration > 0) {
                    const progress = newCurrentTime / stateRefs.current.duration;
                    progressBarValue.setValue(Math.max(0, Math.min(1, progress)));
                }
            }, 50);
        },

        onBuffering: (data: any) => {
            const { isBuffering: buffering } = data;

            timers.clearTimer('bufferingTimeout');

            if (buffering) {
                timers.setTimer('bufferingTimeout', () => {
                    if (stateRefs.current.isReady) {
                        playerState.setIsBuffering(true);
                        playerState.setShowBufferingLoader(true);
                        Animated.timing(animations.bufferOpacity, {
                            toValue: 1,
                            duration: 150,
                            useNativeDriver: true,
                        }).start();
                    }
                }, 200);
            } else {
                playerState.setIsBuffering(false);
                playerState.setShowBufferingLoader(false);
                playerState.setIsSeeking(false);

                Animated.timing(animations.bufferOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            }
        },

        onPlaying: () => {
            console.log('On Playing');
            playerState.setIsReady(true);
            playerState.setIsPlaying(true);
            playerState.setHasStartedPlaying(true);
            playerState.setIsPaused(false);
            playerState.setIsBuffering(false);
            playerState.setShowBufferingLoader(false);
            playerState.setIsSeeking(false);

            timers.clearTimer('bufferingTimeout');

            Animated.timing(animations.bufferOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        },

        onPaused: () => {
            console.log('On Paused');
            playerState.setIsPlaying(false);
            playerState.setIsPaused(true);
            playerState.setIsSeeking(false);
        },

        onStopped: () => {
            console.log('On Stopped');
            playerState.setIsPlaying(false);
            playerState.setIsPaused(false);
            playerState.setIsSeeking(false);
        },

        onEnd: () => {
            console.log('On End');
            playerState.setIsPlaying(false);
            playerState.setIsPaused(false);
            playerState.setIsSeeking(false);
        },

        onError: (error: any) => {
            console.log('VLC Player error:', error);
            let errorMessage = "Failed to load video.";
            if (error?.error) {
                errorMessage += ` ${error.error}`;
            }

            playerState.setError(errorMessage);
            playerState.setIsBuffering(false);
            playerState.setIsReady(false);
            playerState.setShowBufferingLoader(false);
            playerState.setIsSeeking(false);

            timers.clearTimer('bufferingTimeout');
        }
    }), [playerState, animations.bufferOpacity, timers, progressBarValue, animations.controlsOpacity, uiState]);

    useEffect(() => {
        if (!updateProgress || !playerState.isReady || playerState.duration <= 0) return;

        const progressInterval = setInterval(() => {
            if (playerState.currentTime !== undefined && playerState.duration > 0) {
                const progress = calculateProgress(playerState.currentTime, playerState.duration);
                updateProgress({ progress });
            }
        }, 60 * 1000);

        return () => clearInterval(progressInterval);
    }, [playerState.isReady, playerState.duration, playerState.currentTime, updateProgress]);

    const controlActions = useMemo(() => ({
        togglePlayPause: async () => {
            if (!stateRefs.current.isReady) return;
            await playHaptic();

            if (stateRefs.current.isPlaying) {
                console.log('Pause');
                playerState.setIsPaused(true);
            } else {
                console.log('Resume');
                playerState.setIsPaused(false);
            }
            showControlsTemporarily();
        },

        seekTo: (absoluteSeconds: number) => {
            if (!playerRef.current || stateRefs.current.duration <= 0) return;

            const clampedTime = performSeek(absoluteSeconds, stateRefs.current.duration);
            const position = clampedTime / stateRefs.current.duration;

            console.log(`Seeking to: ${clampedTime}s (${(position * 100).toFixed(1)}%)`);

            playerState.setIsSeeking(true);
            playerState.setCurrentTime(clampedTime);
            progressBarValue.setValue(position);

            playerState.setShowBufferingLoader(true);

            timers.clearTimer('seekDebounce');
            timers.setTimer('seekDebounce', () => {
                playerRef.current?.seek(position);
            }, 100);

            showControlsTemporarily();
        },

        skipTime: async (offsetSeconds: number) => {
            if (!stateRefs.current.isReady || stateRefs.current.duration <= 0) return;

            await playHaptic();
            const newTime = stateRefs.current.currentTime + offsetSeconds;
            controlActions.seekTo(newTime);
        },

        toggleMute: async () => {
            await playHaptic();
            settings.setIsMuted(!settings.isMuted);
            console.log('On Toggle Mute');
            showControlsTemporarily();
        },

    }), [playerState, settings, showControlsTemporarily, timers, progressBarValue]);

    const sliderHandlers = useMemo(() => ({
        handleSliderValueChange: (value: number) => {
            if (!stateRefs.current.isReady || stateRefs.current.duration <= 0) return;

            playerState.setIsDragging(true);
            playerState.setDragPosition(value);
            progressBarValue.setValue(value);

            const newTime = value * stateRefs.current.duration;
            playerState.setCurrentTime(newTime);
        },

        handleSliderSlidingStart: () => {
            playerState.setIsDragging(true);
            showControlsTemporarily();
        },

        handleSliderSlidingComplete: (value: number) => {
            if (!stateRefs.current.isReady || stateRefs.current.duration <= 0) {
                playerState.setIsDragging(false);
                return;
            }

            playerState.setIsDragging(false);
            const newTime = value * stateRefs.current.duration;
            controlActions.seekTo(newTime);
        }
    }), [playerState, showControlsTemporarily, controlActions, progressBarValue]);

    const selectSubtitle = useCallback(async (index: number) => {
        console.log('On Select Subtitle:', index);
        await playHaptic();
        settings.setSelectedSubtitle(index);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const selectAudioTrack = useCallback(async (index: number) => {
        console.log('On Select Audio Track:', index);
        await playHaptic();
        settings.setSelectedAudioTrack(index);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const changePlaybackSpeed = useCallback(async (speed: number) => {
        console.log('On Change Playback speed');
        await playHaptic();
        settings.setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const handleOverlayPress = useCallback(() => {
        if (uiState.showControls) {
            hideControls(uiState.setShowControls, animations.controlsOpacity);
        } else {
            showControlsTemporarily();
        }
    }, [uiState, animations.controlsOpacity, showControlsTemporarily]);

    const handleSeekForward = useCallback(async (seconds: number) => {
        if (!stateRefs.current.isReady || stateRefs.current.duration <= 0) return;

        await playHaptic();
        controlActions.skipTime(seconds);

        setSeekFeedback({
            show: true,
            direction: 'forward',
            seconds
        });

        setTimeout(() => {
            setSeekFeedback(prev => ({ ...prev, show: false }));
        }, 50);
    }, [controlActions]);

    const handleSeekBackward = useCallback(async (seconds: number) => {
        if (!stateRefs.current.isReady || stateRefs.current.duration <= 0) return;

        await playHaptic();
        controlActions.skipTime(-seconds);

        setSeekFeedback({
            show: true,
            direction: 'backward',
            seconds
        });

        setTimeout(() => {
            setSeekFeedback(prev => ({ ...prev, show: false }));
        }, 50);
    }, [controlActions]);

    const gestureHandling = useGestureHandling(
        handleSeekForward,
        handleSeekBackward,
        handleOverlayPress,
        timers,
        playerState.isReady
    );

    const displayValues = useMemo(() => 
        calculateSliderValues(
            playerState.isDragging,
            playerState.dragPosition,
            playerState.currentTime,
            playerState.duration
        ),
        [
            playerState.isDragging,
            playerState.dragPosition,
            playerState.currentTime,
            playerState.duration
        ]
    );

    const zoomIn = () => {
        setVideoScale(prev => ({
            x: Math.min(prev.x + 0.025, 2.0),
            y: Math.min(prev.y + 0.025, 2.0)
        }));
    };

    const zoomOut = () => {
        setVideoScale(prev => ({
            x: Math.max(prev.x - 0.025, 1.0),
            y: Math.max(prev.y - 0.025, 1.0)
        }));
    };

    const handleBack = useCallback(async () => {
        await playHaptic();
        const progress = calculateProgress(playerState.currentTime, playerState.duration);
        if (updateProgress) updateProgress({ progress });
        back({ message: '', player: "vlc" });
    }, [playerState.currentTime, playerState.duration, updateProgress, back]);

    const speedActions = buildSpeedActions(settings.playbackSpeed);
    const subtitleActions = buildSubtitleActions(subtitles as SubtitleSource[], settings.selectedSubtitle, true);
    const audioActions = buildAudioActions(playerState.availableAudioTracks, settings.selectedAudioTrack);

    return (
        <View style={styles.container}>
            {!playerState.error && (
                <VLCPlayer
                    ref={playerRef}
                    style={[styles.video, {
                        transform: [{ scaleX: videoScale.x }, { scaleY: videoScale.y }]
                    }]}
                    source={{
                        uri: videoUrl,
                        initType: 2,
                        initOptions: [
                            "--network-caching=5000",
                            "--file-caching=1000",
                            "--live-caching=500",
                            "--drop-late-frames",
                            "--skip-frames",
                            "--avcodec-threads=0",
                            "--intf=dummy",
                            "--no-video-title-show",
                            "--quiet"
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
                    playerState.setIsSeeking(false);
                }}
            />

            <ArtworkBackground
                artwork={artwork}
                isBuffering={playerState.isBuffering}
                hasStartedPlaying={playerState.hasStartedPlaying}
                error={!!playerState.error}
            />

            <BufferingIndicator
                isBuffering={playerState.showBufferingLoader || playerState.isBuffering}
                hasStartedPlaying={playerState.hasStartedPlaying}
                opacity={animations.bufferOpacity}
                error={!!playerState.error}
            />

            {!playerState.hasStartedPlaying && !playerState.error && (
                <BackButton onPress={handleBack} />
            )}

            {!playerState.error && (
                <TouchableOpacity
                    style={styles.touchArea}
                    activeOpacity={1}
                    onPress={gestureHandling.handleTouchablePress}
                />
            )}

            <SubtitleDisplay subtitle={subtitleState.currentSubtitle} error={!!playerState.error} />

            <SeekFeedback
                show={seekFeedback.show}
                direction={seekFeedback.direction}
                seconds={seekFeedback.seconds}
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
                            <Text style={styles.titleText} numberOfLines={1}>
                                {title}
                            </Text>
                        </View>

                        <View style={styles.topRightControls}>
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={zoomOut}
                            >
                                <MaterialIcons
                                    name="zoom-out"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={zoomIn}
                            >
                                <MaterialIcons
                                    name="zoom-in"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={controlActions.toggleMute}
                            >
                                <Ionicons
                                    name={settings.isMuted ? "volume-mute" : "volume-high"}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <MenuView
                                style={{ zIndex: 1000 }}
                                title="Audio Track"
                                onPressAction={({ nativeEvent }) => {
                                    const trackId = parseInt(nativeEvent.event.replace('audio-', ''));
                                    selectAudioTrack(trackId);
                                }}
                                actions={audioActions}
                                themeVariant="dark"
                                onOpenMenu={() => uiState.setPreventAutoHide(true)}
                                onCloseMenu={() => {
                                    uiState.setPreventAutoHide(false);
                                    showControlsTemporarily();
                                }}
                            >
                                <View style={styles.controlButton}>
                                    <MaterialIcons name="audiotrack" size={24} color="white" />
                                </View>
                            </MenuView>

                            {subtitles.length > 0 && (
                                <MenuView
                                    style={{ zIndex: 1000 }}
                                    title="Subtitles"
                                    onPressAction={({ nativeEvent }) => {
                                        if (nativeEvent.event === 'subtitle-off') {
                                            selectSubtitle(-1);
                                        } else {
                                            const index = parseInt(nativeEvent.event.replace('subtitle-', ''));
                                            selectSubtitle(index);
                                        }
                                    }}
                                    actions={subtitleActions}
                                    themeVariant="dark"
                                    onOpenMenu={() => uiState.setPreventAutoHide(true)}
                                    onCloseMenu={() => {
                                        uiState.setPreventAutoHide(false);
                                        showControlsTemporarily();
                                    }}
                                >
                                    <View style={styles.controlButton}>
                                        <MaterialIcons name="closed-caption" size={24} color="white" />
                                    </View>
                                </MenuView>
                            )}

                            <MenuView
                                style={{ zIndex: 1000 }}
                                title="Playback Speed"
                                onPressAction={({ nativeEvent }) => {
                                    const speed = parseFloat(nativeEvent.event.replace('speed-', ''));
                                    changePlaybackSpeed(speed);
                                }}
                                actions={speedActions}
                                themeVariant="dark"
                                onOpenMenu={() => uiState.setPreventAutoHide(true)}
                                onCloseMenu={() => {
                                    uiState.setPreventAutoHide(false);
                                    showControlsTemporarily();
                                }}
                            >
                                <View style={styles.controlButton}>
                                    <MaterialIcons
                                        name="speed"
                                        size={24}
                                        color={"white"}
                                    />
                                </View>
                            </MenuView>
                        </View>
                    </View>

                    <CenterControls
                        isPlaying={playerState.isPlaying}
                        isReady={playerState.isReady}
                        isBuffering={playerState.isBuffering}
                        onPlayPause={controlActions.togglePlayPause}
                        onSkipBackward={() => controlActions.skipTime(-10)}
                        onSkipForward={() => controlActions.skipTime(30)}
                    />

                    <ProgressBar
                        currentTime={displayValues.displayTime}
                        duration={playerState.duration}
                        sliderValue={displayValues.sliderValue}
                        isReady={playerState.isReady}
                        onValueChange={sliderHandlers.handleSliderValueChange}
                        onSlidingStart={sliderHandlers.handleSliderSlidingStart}
                        onSlidingComplete={sliderHandlers.handleSliderSlidingComplete}
                    />
                </Animated.View>
            )}
        </View>
    );
};

export const MediaPlayer = React.memo(VlcMediaPlayerComponent);