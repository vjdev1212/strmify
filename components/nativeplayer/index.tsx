import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TouchableOpacity, Animated, Platform } from "react-native";
import { useVideoPlayer, VideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { MenuComponentRef, MenuView } from '@react-native-menu/menu';
import { WebMenu } from "@/components/WebMenuView";
import { styles } from "../coreplayer/styles";
import { playHaptic } from "../coreplayer/utils";
import { usePlayerState, useSubtitleState, useUIState, usePlayerSettings, useTimers, usePlayerAnimations, hideControls, CONSTANTS, loadSubtitle, handleSubtitleError, findActiveSubtitle, calculateProgress, performSeek, buildSpeedActions, buildSubtitleActions, buildAudioActions, buildStreamActions, calculateSliderValues, ArtworkBackground, WaitingLobby, SubtitleDisplay, CenterControls, ProgressBar, ContentFitLabel, SubtitleSource, ErrorDisplay, ExtendedMediaPlayerProps } from "../coreplayer";
import { View, Text } from "../Themed";

// Menu wrapper component - uses CustomMenu on web, MenuView on native
const MenuWrapper: React.FC<any> = (props) => {
    if (Platform.OS === 'web') {
        return <WebMenu {...props} />;
    }
    return <MenuView {...props} />;
};


export const MediaPlayer: React.FC<ExtendedMediaPlayerProps> = ({
    videoUrl,
    title,
    back: onBack,
    progress,
    artwork,
    subtitles = [],
    openSubtitlesClient,
    updateProgress,
    onPlaybackError,
    streams = [],
    currentStreamIndex = 0,
    onStreamChange
}) => {
    const videoRef = useRef<VideoView>(null);
    const shouldAutoHideControls = useRef(true);
    const isSeeking = useRef(false);
    const isHideControlsScheduled = useRef(false);
    const wasPlayingBeforeSeek = useRef(false);
    const lastKnownTimeRef = useRef<number>(0);
    const hasReportedErrorRef = useRef(false);
    const seekTimeoutRef = useRef<NodeJS.Timeout | any | null>(null);

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

    const audioMenuRef = useRef<MenuComponentRef>(null);
    const subtitleMenuRef = useRef<MenuComponentRef>(null);
    const speedMenuRef = useRef<MenuComponentRef>(null);
    const streamMenuRef = useRef<MenuComponentRef>(null);

    // Local state
    const [contentFit, setContentFit] = useState<'contain' | 'cover' | 'fill'>('cover');
    const [showContentFitLabel, setShowContentFitLabel] = useState(false);
    const [isPiPActive, setIsPiPActive] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);

    const useCustomSubtitles = subtitles.length > 0;

    // Initialize player (memoized to prevent recreation)
    const player = useVideoPlayer({
        uri: videoUrl,
        metadata: { title, artwork },   
        useCaching: true,     
    }, useCallback((player: VideoPlayer) => {
        player.loop = false;
        player.muted = settings.isMuted;
        player.playbackRate = settings.playbackSpeed;   
        player.allowsExternalPlayback = true;     
    }, [settings.isMuted, settings.playbackSpeed]));

    // Restore progress - optimized with dependency array
    useEffect(() => {
        if (playerState.isReady && progress && progress > 0 && player.duration > 0) {
            const currentTime = (progress / 100) * player.duration;
            isSeeking.current = true;
            wasPlayingBeforeSeek.current = false; // Don't auto-play when restoring
            player.currentTime = currentTime;
            playerState.setCurrentTime(currentTime);

            const timeoutId = setTimeout(() => {
                isSeeking.current = false;
            }, 300);
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

    useEffect(() => {
        lastKnownTimeRef.current = playerState.currentTime;
    }, [playerState.currentTime]);

    // Orientation and cleanup
    useEffect(() => {
        return () => {
            if (updateProgress) {
                const progressValue = calculateProgress(lastKnownTimeRef.current, playerState.duration);
                updateProgress({ progress: progressValue });
            }
            clearAllTimers();
            if (seekTimeoutRef.current) {
                clearTimeout(seekTimeoutRef.current);
            }
        };
    }, [clearAllTimers, updateProgress, playerState.duration]);

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
        if (subtitleState.parsedSubtitles.length === 0) {
            subtitleState.setCurrentSubtitle('');
            return;
        }

        const updateSubtitle = () => {
            const text = findActiveSubtitle(player.currentTime, subtitleState.parsedSubtitles);
            if (text !== subtitleState.currentSubtitle) {
                subtitleState.setCurrentSubtitle(text);
            }
        };

        updateSubtitle();
        const interval = setInterval(updateSubtitle, CONSTANTS.SUBTITLE_UPDATE_INTERVAL);
        return () => clearInterval(interval);
    }, [subtitleState.parsedSubtitles, player.currentTime, subtitleState.currentSubtitle]);

    // Player event handlers
    const playingChange = useEvent(player, "playingChange");
    useEffect(() => {
        if (!playingChange) return;

        console.log('PlayingChange:', playingChange.isPlaying, 'isSeeking:', isSeeking.current);
        playerState.setIsPlaying(playingChange.isPlaying);

        // Only hide buffering when video actually starts playing AND we're not in the middle of a seek
        if (playingChange.isPlaying && !isSeeking.current) {
            playerState.setIsBuffering(false);
            Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
    }, [playingChange, bufferOpacity]);

    const timeUpdate = useEvent(player, "timeUpdate");
    useEffect(() => {
        if (!timeUpdate || playerState.isDragging) return;

        playerState.setCurrentTime(timeUpdate.currentTime);
        const videoDuration = player.duration || 0;

        if (videoDuration > 0 && playerState.duration !== videoDuration) {
            playerState.setDuration(videoDuration);
        }
    }, [timeUpdate, playerState.isDragging, player.duration]);

    // Additional polling effect - optimized with ref checks
    useEffect(() => {
        if (!player || !playerState.isPlaying || playerState.isDragging || isSeeking.current) return;

        const pollInterval = setInterval(() => {
            if (!isSeeking.current && player.currentTime !== undefined) {
                const currentTime = player.currentTime;
                if (Math.abs(currentTime - playerState.currentTime) > 0.5) {
                    playerState.setCurrentTime(currentTime);
                }
            }
            if (player.duration > 0 && playerState.duration === 0) {
                playerState.setDuration(player.duration);
            }
        }, 200);

        return () => clearInterval(pollInterval);
    }, [player, playerState.isPlaying, playerState.isDragging]);

    // Progress update interval - optimized
    useEffect(() => {
        if (!updateProgress || !playerState.isReady || playerState.duration <= 0) return;

        const progressInterval = setInterval(() => {
            if (player.currentTime !== undefined && playerState.duration > 0) {
                const progressValue = calculateProgress(player.currentTime, playerState.duration);
                updateProgress({ progress: progressValue });
            }
        }, 10 * 60 * 1000);

        return () => clearInterval(progressInterval);
    }, [player, playerState.isReady, playerState.duration, updateProgress]);

    const statusChange = useEvent(player, "statusChange");
    useEffect(() => {
        if (!statusChange) return;

        const { status, error } = statusChange;

        switch (status) {
            case "loading":
                if (!isSeeking.current && !playerState.isReady) {
                    playerState.setIsBuffering(true);
                    Animated.timing(bufferOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
                }
                setVideoError(null);
                // Reset error report flag on new load attempt
                hasReportedErrorRef.current = false;
                break;

            case "readyToPlay":
                if (!isSeeking.current) {
                    playerState.setIsBuffering(false);
                    Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
                }

                playerState.setIsReady(true);
                playerState.setDuration(player.duration || 0);
                setVideoError(null);
                // Reset error flag on successful load
                hasReportedErrorRef.current = false;

                if (!isSeeking.current && !wasPlayingBeforeSeek.current) {
                    player.play();
                }
                break;

            case "error":
                console.log('Video playback error:', error?.message || 'Unknown error');
                playerState.setIsBuffering(false);
                playerState.setIsReady(false);

                // Only report error once per video URL
                if (onPlaybackError && !hasReportedErrorRef.current) {
                    hasReportedErrorRef.current = true;
                    const errorMessage = error?.message || 'Unable to load video';

                    onPlaybackError({
                        error: errorMessage
                    });

                    // Stop player to prevent repeated error callbacks
                    player.pause();
                } else if (!onPlaybackError) {
                    // If no error handler, show local error
                    const errorMessage = error?.message || 'Unable to load video. The file may be corrupted or in an unsupported format.';
                    setVideoError(errorMessage);
                    player.pause();
                }
                break;
        }
    }, [statusChange, bufferOpacity, player, onPlaybackError]);

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

        // Clear any existing seek timeout
        if (seekTimeoutRef.current) {
            clearTimeout(seekTimeoutRef.current);
        }

        const clampedTime = performSeek(seconds, playerState.duration);

        // Store playing state before seek
        wasPlayingBeforeSeek.current = playerState.isPlaying;

        // Pause if playing
        if (playerState.isPlaying) {
            player.pause();
        }

        // Show buffering indicator
        playerState.setIsBuffering(true);
        Animated.timing(bufferOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();

        // Mark that we're seeking
        isSeeking.current = true;

        // Perform seek
        player.currentTime = clampedTime;
        playerState.setCurrentTime(clampedTime);

        // Wait a bit, then resume playback if it was playing
        // The buffering indicator will be hidden when playingChange event fires
        seekTimeoutRef.current = setTimeout(() => {
            isSeeking.current = false;

            if (wasPlayingBeforeSeek.current) {
                player.play();
            } else {
                // If we weren't playing, hide buffer indicator manually
                playerState.setIsBuffering(false);
                Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
            }
        }, 150);

        showControlsTemporarily();
    }, [playerState, player, showControlsTemporarily, bufferOpacity]);

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
    }, [playerState]);

    const handleSliderComplete = useCallback((value: number) => {
        if (playerState.isReady && playerState.duration > 0) {
            // Clear any existing seek timeout
            if (seekTimeoutRef.current) {
                clearTimeout(seekTimeoutRef.current);
            }

            const newTime = value * playerState.duration;
            wasPlayingBeforeSeek.current = playerState.isPlaying;

            // Pause during seek
            if (playerState.isPlaying) {
                player.pause();
            }

            // Show buffering indicator
            playerState.setIsBuffering(true);
            Animated.timing(bufferOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();

            // Mark that we're seeking
            isSeeking.current = true;

            // Perform seek
            player.currentTime = newTime;
            playerState.setCurrentTime(newTime);

            // Wait a bit, then resume playback if it was playing
            seekTimeoutRef.current = setTimeout(() => {
                console.log('Slider seek complete, resuming playback:', wasPlayingBeforeSeek.current);
                isSeeking.current = false;

                if (wasPlayingBeforeSeek.current) {
                    player.play();
                } else {
                    // If we weren't playing, hide buffer indicator manually
                    playerState.setIsBuffering(false);
                    Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
                }
            }, 150);
        }
        playerState.setIsDragging(false);
    }, [playerState, player, bufferOpacity]);

    // Menu handlers - stable callbacks
    const handleSpeedSelect = useCallback(async (speed: number) => {
        await playHaptic();
        settings.setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [showControlsTemporarily, settings]);

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

    const handleStreamSelect = useCallback(async (index: number) => {
        await playHaptic();
        if (onStreamChange) {
            onStreamChange(index);
        }
        showControlsTemporarily();
    }, [onStreamChange, showControlsTemporarily]);

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
    const streamActions = useMemo(() => buildStreamActions(streams, currentStreamIndex), [streams, currentStreamIndex]);

    // Memoize slider values
    const { displayTime, sliderValue } = useMemo(() => calculateSliderValues(
        playerState.isDragging,
        playerState.dragPosition,
        playerState.currentTime,
        playerState.duration
    ), [playerState.isDragging, playerState.dragPosition, playerState.currentTime, playerState.duration]);

    const handleBack = useCallback(async () => {
        await playHaptic();
        const progressValue = calculateProgress(lastKnownTimeRef.current, playerState.duration);
        onBack({ message: '', progress: progressValue, player: "native" });
    }, [playerState.duration, onBack]);

    const handleRetry = useCallback(() => {
        setVideoError(null);
        hasReportedErrorRef.current = false;
        playerState.setIsReady(false);
        playerState.setIsBuffering(true);
        player.currentTime = 0;
        player.play();
    }, [player, playerState]);

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

    const handleWebStreamAction = useCallback((id: string) => {
        const index = parseInt(id.split('-')[1]);
        if (!isNaN(index)) handleStreamSelect(index);
    }, [handleStreamSelect]);

    const handleNativeStreamAction = useCallback(({ nativeEvent }: any) => {
        const index = parseInt(nativeEvent.event.split('-')[1]);
        if (!isNaN(index)) handleStreamSelect(index);
    }, [handleStreamSelect]);

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
    }, [settings, showControlsTemporarily]);

    const handleSliderStart = useCallback(() => {
        playerState.setIsDragging(true);
        showControlsTemporarily();
    }, [showControlsTemporarily, playerState]);

    const handleSkipBackward = useCallback(() => skipTime(-10), [skipTime]);
    const handleSkipForward = useCallback(() => skipTime(10), [skipTime]);

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
                            {streams.length > 1 && (
                                <MenuWrapper
                                    style={{ zIndex: 1000 }}
                                    ref={streamMenuRef}
                                    title="Select Stream"
                                    onPressAction={Platform.OS === 'web' ? handleWebStreamAction : handleNativeStreamAction}
                                    actions={streamActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={handleMenuOpen}
                                    onCloseMenu={handleMenuClose}
                                >
                                    <TouchableOpacity style={styles.controlButton} onPress={() => {
                                        if (Platform.OS === 'android') {
                                            streamMenuRef.current?.show();
                                        }
                                    }}>
                                        <MaterialIcons name="ondemand-video" size={24} color="white" />
                                    </TouchableOpacity>
                                </MenuWrapper>
                            )}

                            <TouchableOpacity style={styles.controlButton} onPress={handleMuteToggle}>
                                <Ionicons name={settings.isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.controlButton} onPress={cycleContentFit}>
                                <MaterialIcons name={getContentFitIcon()} size={24} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.controlButton} onPress={togglePiP}>
                                <MaterialIcons name={isPiPActive ? "picture-in-picture-alt" : "picture-in-picture"} size={24} color="white" />
                            </TouchableOpacity>

                            {player.availableAudioTracks.length > 0 && (
                                <MenuWrapper
                                    style={{ zIndex: 1000 }}
                                    title="Audio Track"
                                    ref={audioMenuRef}
                                    onPressAction={Platform.OS === 'web' ? handleWebAudioAction : handleNativeAudioAction}
                                    actions={audioActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={handleMenuOpen}
                                    onCloseMenu={handleMenuClose}
                                >
                                    <TouchableOpacity style={styles.controlButton} onPress={() => {
                                        if (Platform.OS === 'android') {
                                            audioMenuRef.current?.show();
                                        }
                                    }}>
                                        <MaterialIcons name="multitrack-audio" size={24} color="white" />
                                    </TouchableOpacity>
                                </MenuWrapper>
                            )}

                            {(useCustomSubtitles || player.availableSubtitleTracks.length > 0) && (
                                <MenuWrapper
                                    style={{ zIndex: 1000 }}
                                    title="Subtitles"
                                    ref={subtitleMenuRef}
                                    onPressAction={Platform.OS === 'web' ? handleWebSubtitleAction : handleNativeSubtitleAction}
                                    actions={subtitleActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={handleMenuOpen}
                                    onCloseMenu={handleMenuClose}
                                >
                                    <TouchableOpacity style={styles.controlButton} onPress={() => {
                                        if (Platform.OS === 'android') {
                                            subtitleMenuRef.current?.show();
                                        }
                                    }}>
                                        <MaterialIcons name="closed-caption" size={24} color="white" />
                                    </TouchableOpacity>
                                </MenuWrapper>
                            )}

                            <MenuWrapper
                                style={{ zIndex: 1000 }}
                                title="Playback Speed"
                                ref={speedMenuRef}
                                onPressAction={Platform.OS === 'web' ? handleWebSpeedAction : handleNativeSpeedAction}
                                actions={speedActions}
                                shouldOpenOnLongPress={false}
                                themeVariant="dark"
                                onOpenMenu={handleMenuOpen}
                                onCloseMenu={handleMenuClose}
                            >
                                <TouchableOpacity style={styles.controlButton} onPress={() => {
                                    if (Platform.OS === 'android') {
                                        speedMenuRef.current?.show();
                                    }
                                }}>
                                    <MaterialIcons name="speed" size={24} color={"white"} />
                                </TouchableOpacity>
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