import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TouchableOpacity, Animated, Platform } from "react-native";
import { useVideoPlayer, VideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { MenuView } from '@react-native-menu/menu';
import { WebMenu } from "@/components/WebMenuView";
import { styles } from "../coreplayer/styles";
import { MediaPlayerProps } from "../coreplayer/models";
import { playHaptic } from "../coreplayer/utils";
import { usePlayerState, useSubtitleState, useUIState, usePlayerSettings, useTimers, usePlayerAnimations, hideControls, CONSTANTS, setupOrientation, cleanupOrientation, loadSubtitle, handleSubtitleError, findActiveSubtitle, calculateProgress, performSeek, buildSpeedActions, buildSubtitleActions, buildAudioActions, calculateSliderValues, ArtworkBackground, WaitingLobby, SubtitleDisplay, CenterControls, ProgressBar, ContentFitLabel, SubtitleSource, ErrorDisplay } from "../coreplayer";
import { View, Text } from "../Themed";

// Menu wrapper component - uses CustomMenu on web, MenuView on native
const MenuWrapper: React.FC<any> = (props) => {
    if (Platform.OS === 'web') {
        return <WebMenu {...props} />;
    }
    return <MenuView {...props} />;
};

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl, title, back: onBack, progress, artwork, subtitles = [], openSubtitlesClient, updateProgress
}) => {
    const videoRef = useRef<VideoView>(null);
    const shouldAutoHideControls = useRef(true);
    const isSeeking = useRef(false);
    const isHideControlsScheduled = useRef(false);

    // Use common hooks
    const playerState = usePlayerState();
    const subtitleState = useSubtitleState();
    const uiState = useUIState();
    const settings = usePlayerSettings();
    const timers = useTimers();
    const animations = usePlayerAnimations();

    // Extract stable references from hooks to avoid dependency issues
    const setShowControls = uiState.setShowControls;
    const controlsOpacity = animations.controlsOpacity;
    const bufferOpacity = animations.bufferOpacity;
    const contentFitLabelOpacity = animations.contentFitLabelOpacity;
    const clearTimer = timers.clearTimer;
    const setTimer = timers.setTimer;
    const clearAllTimers = timers.clearAllTimers;

    // Local state
    const [loadingText, setLoadingText] = useState('Loading...');
    const [contentFit, setContentFit] = useState<'contain' | 'cover' | 'fill'>('cover');
    const [showContentFitLabel, setShowContentFitLabel] = useState(false);
    const [isPiPActive, setIsPiPActive] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);

    const useCustomSubtitles = subtitles.length > 0;

    // Initialize player (memoized to prevent recreation)
    const player = useVideoPlayer({
        uri: videoUrl,
        metadata: { title, artwork }
    }, useCallback((player: VideoPlayer) => {
        player.loop = false;
        player.muted = settings.isMuted;
        player.playbackRate = settings.playbackSpeed;
    }, [settings.isMuted, settings.playbackSpeed]));

    // Restore progress - optimized with dependency array
    useEffect(() => {
        if (playerState.isReady && progress && progress > 0 && player.duration > 0) {
            const currentTime = (progress / 100) * player.duration;
            player.currentTime = currentTime;
            playerState.setCurrentTime(currentTime);
            const timeoutId = setTimeout(() => {
                isSeeking.current = false;
            }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [playerState.isReady, player.duration, progress]);

    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

        clearTimer('hideControls');
        isHideControlsScheduled.current = false;

        if (shouldAutoHideControls.current) {
            isHideControlsScheduled.current = true;
            setTimer('hideControls', () => {
                hideControls(setShowControls, controlsOpacity);
                isHideControlsScheduled.current = false;
            }, CONSTANTS.CONTROLS_AUTO_HIDE_DELAY);
        }
    }, [controlsOpacity, clearTimer, setTimer, setShowControls]);

    // Orientation and cleanup
    useEffect(() => {
        setupOrientation();
        return () => {
            if (updateProgress) {
                const progressValue = calculateProgress(player.currentTime, playerState.duration);
                updateProgress({ progress: progressValue });
            }
            cleanupOrientation();
            clearAllTimers();
        };
    }, [clearAllTimers]);

    // Update player settings - memoized dependencies
    useEffect(() => {
        if (player) {
            player.muted = settings.isMuted;
            player.playbackRate = settings.playbackSpeed;
        }
    }, [player, settings.isMuted, settings.playbackSpeed]);

    // Load subtitles - optimized with better dependency tracking
    useEffect(() => {
        if (!useCustomSubtitles || settings.selectedSubtitle < 0 || settings.selectedSubtitle >= subtitles.length) {
            subtitleState.setParsedSubtitles([]);
            subtitleState.setCurrentSubtitle('');
            return;
        }

        let isMounted = true;

        const loadSub = async () => {
            subtitleState.setIsLoadingSubtitles(true);
            try {
                const parsed = await loadSubtitle(subtitles[settings.selectedSubtitle] as SubtitleSource, openSubtitlesClient);
                if (isMounted) {
                    subtitleState.setParsedSubtitles(parsed);
                }
            } catch (error: any) {
                if (isMounted) {
                    handleSubtitleError(error);
                    subtitleState.setParsedSubtitles([]);
                }
            } finally {
                if (isMounted) {
                    subtitleState.setIsLoadingSubtitles(false);
                    subtitleState.setCurrentSubtitle('');
                }
            }
        };

        loadSub();

        return () => {
            isMounted = false;
        };
    }, [settings.selectedSubtitle, subtitles, openSubtitlesClient, useCustomSubtitles]);

    // Update subtitle display - optimized interval
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
            Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
    }, [playingChange, bufferOpacity]);

    const timeUpdate = useEvent(player, "timeUpdate");
    useEffect(() => {
        if (!timeUpdate || playerState.isDragging) return;

        playerState.setCurrentTime(timeUpdate.currentTime);
        const videoDuration = player.duration || 0;

        if (videoDuration > 0) {
            playerState.setDuration(videoDuration);
        }
    }, [timeUpdate, playerState.isDragging, player.duration]);

    // Additional polling effect - optimized with ref checks
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

    // Progress update interval - optimized
    useEffect(() => {
        if (!updateProgress || !playerState.isReady || playerState.duration <= 0) return;

        const progressInterval = setInterval(() => {
            if (player.currentTime !== undefined && playerState.duration > 0) {
                const progressValue = calculateProgress(player.currentTime, playerState.duration);
                updateProgress({ progress: progressValue });
            }
        }, 60 * 1000);

        return () => clearInterval(progressInterval);
    }, [player, playerState.isReady, playerState.duration, updateProgress]);

    const statusChange = useEvent(player, "statusChange");
    useEffect(() => {
        if (!statusChange) return;

        const { status, error } = statusChange;

        switch (status) {
            case "loading":
                if (!playerState.isReady) {
                    playerState.setIsBuffering(true);
                    Animated.timing(bufferOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
                }
                setVideoError(null);
                break;

            case "readyToPlay":
                playerState.setIsBuffering(false);
                playerState.setIsReady(true);
                playerState.setDuration(player.duration || 0);
                Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
                setVideoError(null);
                player.play();
                break;

            case "error":
                console.error('Video playback error:', error?.message || 'Unknown error');
                playerState.setIsBuffering(false);
                playerState.setIsReady(false);

                // Set user-friendly error message
                const errorMessage = error?.message || 'Unable to load video. The file may be corrupted or in an unsupported format.';
                setVideoError(errorMessage);

                // Stop any playback attempts
                player.pause();
                break;
        }
    }, [statusChange, bufferOpacity, player]);

    // Auto-hide controls when playback starts - with guard to prevent loops
    useEffect(() => {
        if (playerState.isPlaying && uiState.showControls && shouldAutoHideControls.current && !isHideControlsScheduled.current) {
            showControlsTemporarily();
        }
    }, [playerState.isPlaying, uiState.showControls, showControlsTemporarily]);

    const showContentFitLabelTemporarily = useCallback(() => {
        setShowContentFitLabel(true);
        Animated.timing(contentFitLabelOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

        clearTimer('contentFitLabel');
        setTimer('contentFitLabel', () => {
            Animated.timing(contentFitLabelOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
                .start(() => setShowContentFitLabel(false));
        }, CONSTANTS.CONTENT_FIT_LABEL_DELAY);
    }, [contentFitLabelOpacity, clearTimer, setTimer]);

    // Control actions - all optimized with stable dependencies
    const togglePlayPause = useCallback(async () => {
        if (!playerState.isReady) return;
        await playHaptic();
        playerState.isPlaying ? player.pause() : player.play();
        showControlsTemporarily();
    }, [playerState.isPlaying, player, playerState.isReady, showControlsTemporarily]);

    const seekTo = useCallback((seconds: number) => {
        if (!playerState.isReady || playerState.duration <= 0) return;
        const clampedTime = performSeek(seconds, playerState.duration);

        const wasPlaying = playerState.isPlaying;

        playerState.setIsBuffering(true);
        isSeeking.current = true;

        player.currentTime = clampedTime;
        playerState.setCurrentTime(clampedTime);

        if (wasPlaying) {
            player.play();
        }

        setTimeout(() => {
            playerState.setIsBuffering(false);
            isSeeking.current = false;
        }, 500);

        showControlsTemporarily();
    }, [playerState.isReady, playerState.duration, playerState.isPlaying, player, showControlsTemporarily]);

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

    const togglePiP = useCallback(async () => {
        await playHaptic();
        if (videoRef.current) {
            if (isPiPActive) {
                videoRef.current.stopPictureInPicture();
            } else {
                videoRef.current.startPictureInPicture();
            }
        }
        showControlsTemporarily();
    }, [isPiPActive, showControlsTemporarily]);

    const handleOverlayPress = useCallback(() => {
        if (uiState.showControls) {
            hideControls(setShowControls, controlsOpacity);
        } else {
            showControlsTemporarily();
        }
    }, [uiState.showControls, showControlsTemporarily, controlsOpacity, setShowControls]);

    // Slider handlers - optimized
    const handleSliderChange = useCallback((value: number) => {
        if (!playerState.isReady || playerState.duration <= 0) return;
        playerState.setIsDragging(true);
        playerState.setDragPosition(value);
    }, [playerState.isReady, playerState.duration]);

    const handleSliderComplete = useCallback((value: number) => {
        if (playerState.isReady && playerState.duration > 0) {
            const newTime = value * playerState.duration;
            const wasPlaying = playerState.isPlaying;

            playerState.setIsBuffering(true);
            isSeeking.current = true;

            player.currentTime = newTime;
            playerState.setCurrentTime(newTime);

            if (wasPlaying) {
                player.play();
            }

            setTimeout(() => {
                playerState.setIsBuffering(false);
                isSeeking.current = false;
            }, 500);
        }
        playerState.setIsDragging(false);
    }, [playerState.isReady, playerState.duration, playerState.isPlaying, player]);

    // Menu handlers - stable callbacks
    const handleSpeedSelect = useCallback(async (speed: number) => {
        await playHaptic();
        settings.setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleSubtitleSelect = useCallback(async (index: number) => {
        await playHaptic();
        settings.setSelectedSubtitle(index);
        if (!useCustomSubtitles && index >= 0) {
            player.subtitleTrack = player.availableSubtitleTracks[index];
        } else if (!useCustomSubtitles && index === -1) {
            player.subtitleTrack = null;
        }
    }, [useCustomSubtitles, player]);

    const handleAudioSelect = useCallback(async (index: number) => {
        await playHaptic();
        settings.setSelectedAudioTrack(index);
        player.audioTrack = player.availableAudioTracks[index];
    }, [player]);

    // Memoized helper
    const getContentFitIcon = useCallback((): "fit-screen" | "crop" | "fullscreen" => {
        const icons = { contain: 'fit-screen', cover: 'crop', fill: 'fullscreen' } as const;
        return icons[contentFit];
    }, [contentFit]);

    // Memoize menu actions to prevent rebuilding on every render
    const speedActions = useMemo(() => buildSpeedActions(settings.playbackSpeed), [settings.playbackSpeed]);
    const subtitleActions = useMemo(() => buildSubtitleActions(
        subtitles as SubtitleSource[],
        settings.selectedSubtitle,
        useCustomSubtitles,
        player.availableSubtitleTracks
    ), [subtitles, settings.selectedSubtitle, useCustomSubtitles, player.availableSubtitleTracks]);
    const audioActions = useMemo(() => buildAudioActions(
        player.availableAudioTracks,
        settings.selectedAudioTrack
    ), [player.availableAudioTracks, settings.selectedAudioTrack]);

    // Memoize slider values
    const { displayTime, sliderValue } = useMemo(() => calculateSliderValues(
        playerState.isDragging,
        playerState.dragPosition,
        playerState.currentTime,
        playerState.duration
    ), [playerState.isDragging, playerState.dragPosition, playerState.currentTime, playerState.duration]);

    const handleBack = useCallback(async () => {
        await playHaptic();
        const progressValue = calculateProgress(playerState.currentTime, playerState.duration);
        updateProgress({ progress: progressValue });
        onBack({ message: '', player: "native" });
    }, [playerState.currentTime, playerState.duration, updateProgress, onBack]);

    const handleRetry = useCallback(() => {
        setVideoError(null);
        playerState.setIsReady(false);
        playerState.setIsBuffering(true);
        // Force player reload by setting current time to 0
        player.currentTime = 0;
        player.play();
    }, [player]);

    // Memoize menu handlers to prevent recreating on every render
    const handleWebSpeedAction = useCallback((id: string) => {
        const speed = parseFloat(id.split('-')[1]);
        if (!isNaN(speed)) handleSpeedSelect(speed);
    }, [handleSpeedSelect]);

    const handleNativeSpeedAction = useCallback(({ nativeEvent }: any) => {
        const speed = parseFloat(nativeEvent.event.split('-')[1]);
        if (!isNaN(speed)) handleSpeedSelect(speed);
    }, [handleSpeedSelect]);

    const handleWebSubtitleAction = useCallback((id: string) => {
        if (id === 'subtitle-off') {
            handleSubtitleSelect(-1);
        } else {
            const index = parseInt(id.split('-')[1]);
            if (!isNaN(index)) handleSubtitleSelect(index);
        }
    }, [handleSubtitleSelect]);

    const handleNativeSubtitleAction = useCallback(({ nativeEvent }: any) => {
        if (nativeEvent.event === 'subtitle-off') {
            handleSubtitleSelect(-1);
        } else {
            const index = parseInt(nativeEvent.event.split('-')[1]);
            if (!isNaN(index)) handleSubtitleSelect(index);
        }
    }, [handleSubtitleSelect]);

    const handleWebAudioAction = useCallback((id: string) => {
        const index = audioActions.findIndex(a => a.id === id);
        if (index !== -1) handleAudioSelect(index);
    }, [audioActions, handleAudioSelect]);

    const handleNativeAudioAction = useCallback(({ nativeEvent }: any) => {
        const index = audioActions.findIndex(a => a.id === nativeEvent.event);
        if (index !== -1) handleAudioSelect(index);
    }, [audioActions, handleAudioSelect]);

    const handleMenuOpen = useCallback(() => {
        shouldAutoHideControls.current = false;
        clearTimer('hideControls');
    }, [clearTimer]);

    const handleMenuClose = useCallback(() => {
        shouldAutoHideControls.current = true;
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleMuteToggle = useCallback(async () => {
        await playHaptic();
        settings.setIsMuted(!settings.isMuted);
        showControlsTemporarily();
    }, [settings.isMuted, showControlsTemporarily]);

    const handleSliderStart = useCallback(() => {
        playerState.setIsDragging(true);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleSkipBackward = useCallback(() => skipTime(-10), [skipTime]);
    const handleSkipForward = useCallback(() => skipTime(30), [skipTime]);

    // If there's an error, show error display
    if (videoError) {
        return (
            <ErrorDisplay
                error={videoError}
                onBack={handleBack}
                onRetry={handleRetry}
            />
        );
    }

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

            <WaitingLobby
                hasStartedPlaying={playerState.isReady}
                opacity={bufferOpacity}
            />

            <TouchableOpacity style={styles.touchArea} activeOpacity={1} onPress={handleOverlayPress} />

            <SubtitleDisplay subtitle={useCustomSubtitles ? subtitleState.currentSubtitle : ''} />

            {uiState.showControls && (
                <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]} pointerEvents="box-none">
                    <View style={styles.topControls}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                        </View>

                        <View style={styles.topRightControls}>
                            <TouchableOpacity style={styles.controlButton} onPress={handleMuteToggle}>
                                <Ionicons name={settings.isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.controlButton} onPress={cycleContentFit}>
                                <MaterialIcons name={getContentFitIcon()} size={24} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.controlButton} onPress={togglePiP}>
                                <MaterialIcons name={isPiPActive ? "picture-in-picture-alt" : "picture-in-picture"} size={24} color="white" />
                            </TouchableOpacity>

                            {/* Audio Track Menu */}
                            {player.availableAudioTracks.length > 0 && (
                                <MenuWrapper
                                    style={{ zIndex: 1000 }}
                                    title="Audio Track"
                                    onPressAction={Platform.OS === 'web' ? handleWebAudioAction : handleNativeAudioAction}
                                    actions={audioActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={handleMenuOpen}
                                    onCloseMenu={handleMenuClose}
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
                                    onPressAction={Platform.OS === 'web' ? handleWebSubtitleAction : handleNativeSubtitleAction}
                                    actions={subtitleActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={handleMenuOpen}
                                    onCloseMenu={handleMenuClose}
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
                                onPressAction={Platform.OS === 'web' ? handleWebSpeedAction : handleNativeSpeedAction}
                                actions={speedActions}
                                shouldOpenOnLongPress={false}
                                themeVariant="dark"
                                onOpenMenu={handleMenuOpen}
                                onCloseMenu={handleMenuClose}
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
                        onSkipBackward={handleSkipBackward}
                        onSkipForward={handleSkipForward}
                    />

                    <View style={styles.bottomControls}>
                        <ProgressBar
                            currentTime={displayTime}
                            duration={playerState.duration}
                            sliderValue={sliderValue}
                            isReady={playerState.isReady}
                            onValueChange={handleSliderChange}
                            onSlidingStart={handleSliderStart}
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
                opacity={contentFitLabelOpacity}
            />
        </View>
    );
};