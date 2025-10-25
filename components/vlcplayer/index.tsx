import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TouchableOpacity, Animated, Platform } from "react-native";
import { VLCPlayer } from 'react-native-vlc-media-player';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { MenuView } from '@react-native-menu/menu';
import { LinearGradient } from "expo-linear-gradient";
import ImmersiveMode from "react-native-immersive-mode";
import { View, Text } from "../Themed";
import { playHaptic, formatTime } from "../coreplayer/utils";
import { styles } from "../coreplayer/styles";
import { 
    ArtworkBackground, 
    BackButton, 
    BufferingIndicator, 
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
    artwork,
    subtitles = [],
    openSubtitlesClient,
    switchMediaPlayer,
    updateProgress
}) => {
    const playerRef = useRef<VLCPlayer>(null);
    const shouldAutoHideControls = useRef(true);
    const isSeeking = useRef(false);
    
    const playerState = useVLCPlayerState();
    const subtitleState = useSubtitleState();
    const uiState = useUIState();
    const settings = usePlayerSettings();
    const timers = useTimers();
    const animations = usePlayerAnimations();
    
    const [contentFit, setContentFit] = useState<'contain' | 'cover' | 'fill'>('cover');
    const [showContentFitLabel, setShowContentFitLabel] = useState(false);

    const stateRefs = useRef({
        isPlaying: false,
        isReady: false,
        isDragging: false,
        currentTime: 0,
        duration: 0
    });

    const progressBarValue = useRef(new Animated.Value(0)).current;

    useEffect(() => { stateRefs.current.isPlaying = playerState.isPlaying; }, [playerState.isPlaying]);
    useEffect(() => { stateRefs.current.isReady = playerState.isReady; }, [playerState.isReady]);
    useEffect(() => { stateRefs.current.isDragging = playerState.isDragging; }, [playerState.isDragging]);
    useEffect(() => { stateRefs.current.currentTime = playerState.currentTime; }, [playerState.currentTime]);
    useEffect(() => { stateRefs.current.duration = playerState.duration; }, [playerState.duration]);

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

    useEffect(() => {
        setupOrientation();
        if (Platform.OS === "android") {
            ImmersiveMode.fullLayout(true);
        }
        return () => {
            cleanupOrientation();
            timers.clearAllTimers();
            if (Platform.OS === "android") {
                ImmersiveMode.fullLayout(false);
            }
        };
    }, []);

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
    }, [settings.selectedSubtitle, subtitles, openSubtitlesClient]);

    useEffect(() => {
        if (subtitleState.parsedSubtitles.length === 0) return;

        const updateSubtitle = () => {
            const text = findActiveSubtitle(playerState.currentTime, subtitleState.parsedSubtitles);
            subtitleState.setCurrentSubtitle(text);
        };

        updateSubtitle();
        const interval = setInterval(updateSubtitle, CONSTANTS.SUBTITLE_UPDATE_INTERVAL);
        return () => clearInterval(interval);
    }, [subtitleState.parsedSubtitles, playerState.currentTime]);

    const vlcHandlers = useMemo(() => ({
        onLoad: (data: any) => {
            playerState.setIsBuffering(false);
            playerState.setIsReady(true);
            playerState.setError(null);
            playerState.setHasStartedPlaying(true);
            playerState.setIsPlaying(true);
            playerState.setShowBufferingLoader(false);
            playerState.setIsSeeking(false);

            if (data?.audioTracks) {
                playerState.setAvailableAudioTracks(data.audioTracks);
            }
            if (data?.duration) {
                playerState.setDuration(data.duration / 1000);
            }

            Animated.timing(animations.bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        },

        onProgress: (data: any) => {
            if (stateRefs.current.isDragging || isSeeking.current) return;

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
        },

        onBuffering: (data: any) => {
            const { isBuffering: buffering } = data;

            if (buffering && stateRefs.current.isReady) {
                playerState.setIsBuffering(true);
                Animated.timing(animations.bufferOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            }
        },

        onPlaying: () => {
            playerState.setIsPlaying(true);
            playerState.setIsPaused(false);
            playerState.setIsBuffering(false);
            playerState.setShowBufferingLoader(false);
            isSeeking.current = false;

            Animated.timing(animations.bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        },

        onPaused: () => {
            playerState.setIsPlaying(false);
            playerState.setIsPaused(true);
        },

        onStopped: () => {
            playerState.setIsPlaying(false);
            playerState.setIsPaused(false);
        },

        onEnd: () => {
            playerState.setIsPlaying(false);
            playerState.setIsPaused(false);
        },

        onError: (error: any) => {
            let errorMessage = "Unable to load the video.";
            if (error?.error) {
                errorMessage = `Unable to load the video. ${error.error}`;
            }

            playerState.setError(errorMessage);
            playerState.setIsBuffering(false);
            playerState.setIsReady(false);
            playerState.setShowBufferingLoader(false);
        }
    }), [playerState, animations.bufferOpacity, progressBarValue]);

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

    const togglePlayPause = useCallback(async () => {
        if (!playerState.isReady) return;
        await playHaptic();
        playerState.setIsPaused(!playerState.isPlaying);
        showControlsTemporarily();
    }, [playerState.isPlaying, playerState.isReady, showControlsTemporarily]);

    const seekTo = useCallback((seconds: number) => {
        if (!playerRef.current || playerState.duration <= 0) return;
        const clampedTime = performSeek(seconds, playerState.duration);
        const position = clampedTime / playerState.duration;
        
        isSeeking.current = true;
        playerState.setCurrentTime(clampedTime);
        progressBarValue.setValue(position);
        
        playerRef.current?.seek(position);
        
        setTimeout(() => {
            isSeeking.current = false;
        }, 500);
        
        showControlsTemporarily();
    }, [playerState.duration, playerState, showControlsTemporarily, progressBarValue]);

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

    const handleSliderChange = useCallback((value: number) => {
        if (!playerState.isReady || playerState.duration <= 0) return;
        playerState.setIsDragging(true);
        playerState.setDragPosition(value);
        progressBarValue.setValue(value);
    }, [playerState.duration, playerState.isReady, progressBarValue]);

    const handleSliderComplete = useCallback((value: number) => {
        if (playerState.isReady && playerState.duration > 0) {
            const newTime = value * playerState.duration;
            seekTo(newTime);
        }
        playerState.setIsDragging(false);
    }, [playerState.duration, playerState.isReady, seekTo]);

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

    const getContentFitIcon = (): "fit-screen" | "crop" | "fullscreen" => {
        const icons = { contain: 'fit-screen', cover: 'crop', fill: 'fullscreen' } as const;
        return icons[contentFit];
    };

    const getVideoScale = () => {
        switch (contentFit) {
            case 'contain': return { x: 0.85, y: 0.85 };
            case 'cover': return { x: 1.0, y: 1.0 };
            case 'fill': return { x: 1.2, y: 1.2 };
            default: return { x: 1.0, y: 1.0 };
        }
    };

    const speedActions = buildSpeedActions(settings.playbackSpeed);
    const subtitleActions = buildSubtitleActions(subtitles as SubtitleSource[], settings.selectedSubtitle, true);
    const audioActions = buildAudioActions(playerState.availableAudioTracks, settings.selectedAudioTrack);

    const { displayTime, sliderValue } = calculateSliderValues(
        playerState.isDragging,
        playerState.dragPosition,
        playerState.currentTime,
        playerState.duration
    );

    const handleBack = useCallback(async () => {
        await playHaptic();
        const progress = calculateProgress(playerState.currentTime, playerState.duration);
        if (updateProgress) updateProgress({ progress });
        onBack({ message: '', player: "vlc" });
    }, [playerState.currentTime, playerState.duration, updateProgress, onBack]);

    const videoScale = getVideoScale();

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
                }}
            />

            <ArtworkBackground
                artwork={artwork}
                isBuffering={playerState.isBuffering}
                hasStartedPlaying={playerState.hasStartedPlaying}
                error={!!playerState.error}
            />

            <BufferingIndicator
                isBuffering={playerState.isBuffering || playerState.showBufferingLoader}
                hasStartedPlaying={playerState.hasStartedPlaying}
                opacity={animations.bufferOpacity}
                error={!!playerState.error}
            />

            <TouchableOpacity style={styles.touchArea} activeOpacity={1} onPress={handleOverlayPress} />

            <SubtitleDisplay subtitle={subtitleState.currentSubtitle} error={!!playerState.error} />

            {!playerState.isReady && !playerState.error && <BackButton onPress={handleBack} persistent />}

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
                                    <View style={styles.controlButton}>
                                        <MaterialIcons name="audiotrack" size={24} color="white" />
                                    </View>
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
                                    <View style={styles.controlButton}>
                                        <MaterialIcons name="closed-caption" size={24} color="white" />
                                    </View>
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
                                <View style={styles.controlButton}>
                                    <MaterialIcons name="speed" size={24} color="white" />
                                </View>
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

            <ContentFitLabel
                show={showContentFitLabel}
                contentFit={contentFit}
                opacity={animations.contentFitLabelOpacity}
            />
        </View>
    );
};

export const MediaPlayer = React.memo(VlcMediaPlayerComponent);