import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TouchableOpacity, Animated, Platform, Dimensions } from "react-native";
import Video, { OnLoadData, OnProgressData, VideoRef, OnBufferData, ResizeMode, SelectedTrack, TextTrackType } from "react-native-video";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { MenuComponentRef, MenuView } from '@react-native-menu/menu';
import { WebMenu } from "@/components/WebMenuView";
import { styles } from "../coreplayer/styles";
import {
    usePlayerState,
    useSubtitleState,
    useUIState,
    useEnhancedPlayerSettings,
    useTimers,
    usePlayerAnimations,
    hideControls,
    CONSTANTS,
    loadSubtitle,
    handleSubtitleError,
    findActiveSubtitleWithDelay,
    calculateProgress,
    performSeek,
    buildSettingsActions,
    buildSubtitleActions,
    buildAudioActions,
    buildStreamActions,
    calculateSliderValues,
    ArtworkBackground,
    WaitingLobby,
    SubtitleDisplay,
    CenterControls,
    ProgressBar,
    ContentFitLabel,
    SubtitleSource,
    SubtitlePosition,
    ErrorDisplay,
    ExtendedMediaPlayerProps
} from "../coreplayer";
import { View, Text } from "../Themed";
import { GlassView } from 'expo-glass-effect';
import { SkipBanner } from "../introdb/skipBanner";
import { useIntroDB } from "../introdb/useIntroDb";

// Menu wrapper component - uses WebMenu on web, MenuView on native
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
    onStreamChange,
    onForceSwitchToKSPlayer,
    tvShow
}) => {
    const videoRef = useRef<VideoRef>(null);
    const shouldAutoHideControls = useRef(true);
    const isSeeking = useRef(false);
    const isHideControlsScheduled = useRef(false);
    const wasPlayingBeforeSeek = useRef(false);
    const lastKnownTimeRef = useRef<number>(0);
    const hasReportedErrorRef = useRef(false);
    const seekTimeoutRef = useRef<any>(null);
    const progressUpdateTimerRef = useRef<any>(null);

    // Use common hooks
    const playerState = usePlayerState();
    const subtitleState = useSubtitleState();
    const uiState = useUIState();
    const settings = useEnhancedPlayerSettings();
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
    const settingsMenuRef = useRef<MenuComponentRef>(null);
    const streamMenuRef = useRef<MenuComponentRef>(null);

    // Local state
    const [contentFit, setContentFit] = useState<ResizeMode>(ResizeMode.COVER);
    const [showContentFitLabel, setShowContentFitLabel] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [availableAudioTracks, setAvailableAudioTracks] = useState<any[]>([]);
    const [availableTextTracks, setAvailableTextTracks] = useState<any[]>([]);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
    const [selectedTextTrack, setSelectedTextTrack] = useState<number>(-1);
    const [useEmbeddedSubtitles, setUseEmbeddedSubtitles] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const useCustomSubtitles = subtitles.length > 0 && !useEmbeddedSubtitles;

    // Restore progress
    useEffect(() => {
        if (playerState.isReady && progress && progress > 0 && playerState.duration > 0) {
            const currentTime = (progress / 100) * playerState.duration;
            isSeeking.current = true;
            wasPlayingBeforeSeek.current = false;

            if (videoRef.current) {
                videoRef.current.seek(currentTime);
            }
            playerState.setCurrentTime(currentTime);

            const timeoutId = setTimeout(() => {
                isSeeking.current = false;
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [playerState.isReady, playerState.duration, progress]);

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

    // Cleanup
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
            if (progressUpdateTimerRef.current) {
                clearInterval(progressUpdateTimerRef.current);
            }
        };
    }, [clearAllTimers, updateProgress, playerState.duration]);

    // Load custom subtitles (OpenSubtitles)
    useEffect(() => {
        if (!useCustomSubtitles || settings.selectedSubtitle < 0 || settings.selectedSubtitle >= subtitles.length) {
            if (!useEmbeddedSubtitles) {
                subtitleState.setParsedSubtitles([]);
                subtitleState.setCurrentSubtitle('');
            }
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
    }, [settings.selectedSubtitle, subtitles, openSubtitlesClient, useCustomSubtitles, useEmbeddedSubtitles]);

    // Update subtitle display with delay support
    useEffect(() => {
        if (!useCustomSubtitles || subtitleState.parsedSubtitles.length === 0) {
            if (!useEmbeddedSubtitles) {
                subtitleState.setCurrentSubtitle('');
            }
            return;
        }

        const updateSubtitle = () => {
            const text = findActiveSubtitleWithDelay(
                playerState.currentTime,
                subtitleState.parsedSubtitles,
                settings.subtitleDelay
            );
            if (text !== subtitleState.currentSubtitle) {
                subtitleState.setCurrentSubtitle(text);
            }
        };

        updateSubtitle();
        const interval = setInterval(updateSubtitle, CONSTANTS.SUBTITLE_UPDATE_INTERVAL);
        return () => clearInterval(interval);
    }, [subtitleState.parsedSubtitles, playerState.currentTime, subtitleState.currentSubtitle, settings.subtitleDelay, useCustomSubtitles, useEmbeddedSubtitles]);

    // Progress update interval
    useEffect(() => {
        if (!updateProgress || !playerState.isReady || playerState.duration <= 0) return;

        progressUpdateTimerRef.current = setInterval(() => {
            if (playerState.currentTime !== undefined && playerState.duration > 0) {
                const progressValue = calculateProgress(playerState.currentTime, playerState.duration);
                updateProgress({ progress: progressValue });
            }
        }, 1 * 60 * 1000);

        return () => {
            if (progressUpdateTimerRef.current) {
                clearInterval(progressUpdateTimerRef.current);
            }
        };
    }, [playerState.isReady, playerState.duration, updateProgress]);

    // Auto-hide controls when playback starts
    useEffect(() => {
        if (!isPaused && uiState.showControls && shouldAutoHideControls.current && !isHideControlsScheduled.current) {
            showControlsTemporarily();
        }
    }, [isPaused, uiState.showControls, showControlsTemporarily]);

    const showContentFitLabelTemporarily = useCallback(() => {
        setShowContentFitLabel(true);
        Animated.timing(contentFitLabelOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

        clearTimer('contentFitLabel');
        setTimer('contentFitLabel', () => {
            Animated.timing(contentFitLabelOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
                .start(() => setShowContentFitLabel(false));
        }, CONSTANTS.CONTENT_FIT_LABEL_DELAY);
    }, [contentFitLabelOpacity, clearTimer, setTimer]);

    // Video event handlers
    const handleLoad = useCallback((data: OnLoadData) => {
        playerState.setIsReady(true);
        playerState.setDuration(data.duration);
        playerState.setIsBuffering(false);
        setVideoError(null);
        hasReportedErrorRef.current = false;

        console.log('OnLoad Data', data);

        Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();

        if (data.audioTracks && Array.isArray(data.audioTracks) && data.audioTracks.length > 0) {
            setAvailableAudioTracks(data.audioTracks);
            if (selectedAudioTrack === -1) {
                setSelectedAudioTrack(0);
                settings.setSelectedAudioTrack(0);
            }
        }

        if (data.textTracks && Array.isArray(data.textTracks) && data.textTracks.length > 0) {
            setAvailableTextTracks(data.textTracks);
        }
    }, [bufferOpacity, playerState, selectedAudioTrack, settings]);

    const handleAudioTracks = useCallback((data: { audioTracks: any[] }) => {
        if (data.audioTracks && Array.isArray(data.audioTracks) && data.audioTracks.length > 0) {
            setAvailableAudioTracks(data.audioTracks);
            if (selectedAudioTrack === -1) {
                setSelectedAudioTrack(0);
                settings.setSelectedAudioTrack(0);
            }
        }
    }, [selectedAudioTrack, settings]);

    const handleTextTracks = useCallback((data: { textTracks: any[] }) => {
        if (data.textTracks && Array.isArray(data.textTracks) && data.textTracks.length > 0) {
            setAvailableTextTracks(data.textTracks);
        }
    }, []);

    const handleProgress = useCallback((data: OnProgressData) => {
        if (!playerState.isDragging && !isSeeking.current) {
            playerState.setCurrentTime(data.currentTime);
        }
    }, [playerState]);

    const handleBuffer = useCallback((data: OnBufferData) => {
        if (!isSeeking.current && !playerState.isDragging) {
            playerState.setIsBuffering(data.isBuffering);
            Animated.timing(bufferOpacity, {
                toValue: data.isBuffering ? 1 : 0,
                duration: 200,
                useNativeDriver: true
            }).start();
        }
    }, [bufferOpacity, playerState]);

    const handleError = useCallback((error: any) => {
        playerState.setIsBuffering(false);
        playerState.setIsReady(false);

        if (onPlaybackError && !hasReportedErrorRef.current) {
            hasReportedErrorRef.current = true;
            const errorMessage = error?.error?.message || error?.message || 'Unable to load video';
            onPlaybackError({ error: errorMessage });
            setIsPaused(true);
        } else if (!onPlaybackError) {
            const errorMessage = error?.error?.message || error?.message || 'Unable to load video. The file may be corrupted or in an unsupported format.';
            setVideoError(errorMessage);
            setIsPaused(true);
        }
    }, [onPlaybackError, playerState]);

    const handleLoadStart = useCallback(() => {
        if (!isSeeking.current && !playerState.isReady) {
            playerState.setIsBuffering(true);
            Animated.timing(bufferOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        }
    }, [bufferOpacity, playerState]);

    const handleEnd = useCallback(() => {
        setIsPaused(true);
        playerState.setIsPlaying(false);
    }, [playerState]);

    const seekTo = useCallback((seconds: number) => {
        if (!playerState.isReady || playerState.duration <= 0 || !videoRef.current) return;

        if (seekTimeoutRef.current) {
            clearTimeout(seekTimeoutRef.current);
        }

        const clampedTime = performSeek(seconds, playerState.duration);

        wasPlayingBeforeSeek.current = !isPaused;

        if (!isPaused) {
            setIsPaused(true);
        }

        playerState.setIsBuffering(true);
        Animated.timing(bufferOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();

        isSeeking.current = true;

        videoRef.current.seek(clampedTime);
        playerState.setCurrentTime(clampedTime);

        seekTimeoutRef.current = setTimeout(() => {
            isSeeking.current = false;
            playerState.setIsBuffering(false);
            Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();

            if (wasPlayingBeforeSeek.current) {
                setIsPaused(false);
            }
        }, 300);

        showControlsTemporarily();
    }, [playerState, isPaused, showControlsTemporarily, bufferOpacity]);

    // ---- IntroDB segment skipping ----
    const { activeSegment, skip: skipSegment } = useIntroDB({
        imdbId: tvShow?.imdbId ?? null,
        season: tvShow?.season ?? null,
        episode: tvShow?.episode ?? null,
        currentTime: playerState.currentTime,
        onSkip: seekTo,
    });

    const togglePlayPause = useCallback(() => {
        if (!playerState.isReady) return;
        setIsPaused(!isPaused);
        playerState.setIsPlaying(isPaused);
        showControlsTemporarily();
    }, [isPaused, playerState, showControlsTemporarily]);

    const skipTime = useCallback((seconds: number) => {
        if (!playerState.isReady) return;
        seekTo(playerState.currentTime + seconds);
    }, [playerState.currentTime, seekTo, playerState.isReady]);

    const cycleContentFit = useCallback(() => {
        const currentIndex = CONSTANTS.RN_VIDEO_CONTENT_FIT_OPTIONS.indexOf(contentFit);
        setContentFit(CONSTANTS.RN_VIDEO_CONTENT_FIT_OPTIONS[(currentIndex + 1) % CONSTANTS.CONTENT_FIT_OPTIONS.length]);
        showContentFitLabelTemporarily();
        showControlsTemporarily();
    }, [contentFit, showControlsTemporarily, showContentFitLabelTemporarily]);

    const handleOverlayPress = useCallback(() => {
        if (uiState.showControls) {
            hideControls(setShowControls, controlsOpacity);
        } else {
            showControlsTemporarily();
        }
    }, [uiState.showControls, showControlsTemporarily, controlsOpacity, setShowControls]);

    const handleSliderChange = useCallback((value: number) => {
        if (!playerState.isReady || playerState.duration <= 0) return;
        playerState.setIsDragging(true);
        playerState.setDragPosition(value);
    }, [playerState]);

    const handleSliderComplete = useCallback((value: number) => {
        if (playerState.isReady && playerState.duration > 0 && videoRef.current) {
            if (seekTimeoutRef.current) {
                clearTimeout(seekTimeoutRef.current);
            }

            const newTime = value * playerState.duration;
            wasPlayingBeforeSeek.current = !isPaused;

            if (!isPaused) {
                setIsPaused(true);
            }

            playerState.setIsBuffering(true);
            Animated.timing(bufferOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();

            isSeeking.current = true;

            videoRef.current.seek(newTime);
            playerState.setCurrentTime(newTime);

            seekTimeoutRef.current = setTimeout(() => {
                isSeeking.current = false;

                if (wasPlayingBeforeSeek.current) {
                    setIsPaused(false);
                } else {
                    playerState.setIsBuffering(false);
                    Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
                }
            }, 150);
        }
        playerState.setIsDragging(false);
    }, [playerState, isPaused, bufferOpacity]);

    const handlePlaybackSpeedSelect = useCallback((speed: number) => {
        settings.setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [showControlsTemporarily, settings]);

    const handleSubtitleTrackSelect = useCallback((index: number) => {
        if (index === -1) {
            settings.setSelectedSubtitle(-1);
            setSelectedTextTrack(-1);
            setUseEmbeddedSubtitles(false);
            subtitleState.setParsedSubtitles([]);
            subtitleState.setCurrentSubtitle('');
        } else if (index < subtitles.length) {
            settings.setSelectedSubtitle(index);
            setSelectedTextTrack(-1);
            setUseEmbeddedSubtitles(false);
        } else {
            const embeddedIndex = index - subtitles.length;
            settings.setSelectedSubtitle(-1);
            setSelectedTextTrack(embeddedIndex);
            setUseEmbeddedSubtitles(true);
            subtitleState.setParsedSubtitles([]);
            subtitleState.setCurrentSubtitle('');
        }
    }, [subtitles.length, settings, subtitleState]);

    const handleSubtitlePositionSelect = useCallback((position: SubtitlePosition) => {
        settings.setSubtitlePosition(position);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const handleSubtitleDelaySelect = useCallback((delayMs: number) => {
        settings.setSubtitleDelay(delayMs);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const handleAudioSelect = useCallback((index: number) => {
        settings.setSelectedAudioTrack(index);
        setSelectedAudioTrack(index);
    }, [settings]);

    const handleStreamSelect = useCallback((index: number) => {
        if (onStreamChange) {
            onStreamChange(index);
        }
        showControlsTemporarily();
    }, [onStreamChange, showControlsTemporarily]);

    const getContentFitIcon = useCallback((): "fit-screen" | "crop" | "fullscreen" => {
        switch (contentFit) {
            case ResizeMode.CONTAIN: return 'fit-screen';
            case ResizeMode.COVER: return 'crop';
            case ResizeMode.STRETCH: return 'fullscreen';
            default: return 'crop';
        }
    }, [contentFit]);

    const adaptTextTracks = useCallback((tracks: any[]): any[] => {
        if (!tracks || !Array.isArray(tracks)) return [];
        return tracks.map((track, index) => ({
            id: track.index ?? index,
            label: track.title || track.language || `Track ${index + 1}`,
            language: track.language,
            name: track.title || track.language || `Track ${index + 1}`
        }));
    }, []);

    const adaptAudioTracks = useCallback((tracks: any[]): any[] => {
        if (!tracks || !Array.isArray(tracks)) return [];
        return tracks.map((track, index) => ({
            id: track.index ?? index,
            label: track.title || track.language || `Track ${index + 1}`,
            language: track.language,
            name: track.title || track.language || `Track ${index + 1}`
        }));
    }, []);

    const settingsActions = useMemo(() => buildSettingsActions(settings.playbackSpeed), [settings.playbackSpeed]);

    const subtitleActions = useMemo(() => {
        const adaptedTracks = adaptTextTracks(availableTextTracks);
        let currentSelection = -1;
        if (useEmbeddedSubtitles && selectedTextTrack >= 0) {
            currentSelection = subtitles.length + selectedTextTrack;
        } else if (!useEmbeddedSubtitles && settings.selectedSubtitle >= 0) {
            currentSelection = settings.selectedSubtitle;
        }
        return buildSubtitleActions(
            subtitles as SubtitleSource[],
            currentSelection,
            !useEmbeddedSubtitles,
            adaptedTracks,
            settings.subtitlePosition,
            settings.subtitleDelay,
            selectedTextTrack
        );
    }, [subtitles, settings.selectedSubtitle, useEmbeddedSubtitles, availableTextTracks, settings.subtitlePosition, settings.subtitleDelay, selectedTextTrack, adaptTextTracks]);

    const audioActions = useMemo(() => {
        const adaptedTracks = adaptAudioTracks(availableAudioTracks);
        return buildAudioActions(adaptedTracks, selectedAudioTrack);
    }, [availableAudioTracks, selectedAudioTrack, adaptAudioTracks]);

    const streamActions = useMemo(() => buildStreamActions(streams, currentStreamIndex), [streams, currentStreamIndex]);

    const { displayTime, sliderValue } = useMemo(() => calculateSliderValues(
        playerState.isDragging,
        playerState.dragPosition,
        playerState.currentTime,
        playerState.duration
    ), [playerState.isDragging, playerState.dragPosition, playerState.currentTime, playerState.duration]);

    const handleBack = useCallback(() => {
        const progressValue = calculateProgress(lastKnownTimeRef.current, playerState.duration);
        onBack({ message: '', progress: progressValue, player: "native" });
    }, [playerState.duration, onBack]);

    const handleRetry = useCallback(() => {
        setVideoError(null);
        hasReportedErrorRef.current = false;
        playerState.setIsReady(false);
        playerState.setIsBuffering(true);
        if (videoRef.current) {
            videoRef.current.seek(0);
        }
        setIsPaused(false);
    }, [playerState]);

    const handleMenuAction = useCallback((id: string) => {
        if (id.startsWith('speed-')) {
            const speed = parseFloat(id.split('-')[1]);
            if (!isNaN(speed)) handlePlaybackSpeedSelect(speed);
        } else if (id === 'subtitle-track-off') {
            handleSubtitleTrackSelect(-1);
        } else if (id.startsWith('embedded-track-')) {
            const trackId = parseInt(id.split('embedded-track-')[1]);
            if (!isNaN(trackId)) handleSubtitleTrackSelect(subtitles.length + trackId);
        } else if (id.startsWith('subtitle-track-')) {
            const index = parseInt(id.split('subtitle-track-')[1]);
            if (!isNaN(index)) handleSubtitleTrackSelect(index);
        } else if (id.startsWith('position-')) {
            const position = parseInt(id.split('-')[1]);
            if (!isNaN(position)) handleSubtitlePositionSelect(position);
        } else if (id.startsWith('delay_')) {
            const delayMs = parseInt(id.replace('delay_', ''));
            if (!isNaN(delayMs)) handleSubtitleDelaySelect(delayMs);
        } else if (id.startsWith('audio-')) {
            const index = parseInt(id.split('-')[1]);
            if (!isNaN(index)) handleAudioSelect(index);
        } else if (id.startsWith('stream-')) {
            const index = parseInt(id.split('-')[1]);
            if (!isNaN(index)) handleStreamSelect(index);
        }
    }, [handlePlaybackSpeedSelect, handleSubtitleTrackSelect, handleSubtitlePositionSelect, handleSubtitleDelaySelect, handleAudioSelect, handleStreamSelect, subtitles.length]);

    const handleWebAction = useCallback((id: string) => handleMenuAction(id), [handleMenuAction]);
    const handleNativeAction = useCallback(({ nativeEvent }: any) => handleMenuAction(nativeEvent.event), [handleMenuAction]);

    const handleMenuOpen = useCallback(() => {
        shouldAutoHideControls.current = false;
        clearTimer('hideControls');
    }, [clearTimer]);

    const handleMenuClose = useCallback(() => {
        shouldAutoHideControls.current = true;
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleMuteToggle = useCallback(() => {
        settings.setIsMuted(!settings.isMuted);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const handleSliderStart = useCallback(() => {
        playerState.setIsDragging(true);
        showControlsTemporarily();
    }, [showControlsTemporarily, playerState]);

    const handleSkipBackward = useCallback(() => skipTime(-10), [skipTime]);
    const handleSkipForward = useCallback(() => skipTime(30), [skipTime]);

    const goToFullscreen = useCallback(async () => {
        videoRef.current?.presentFullscreenPlayer();
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const videoSelectedTextTrack: SelectedTrack | undefined = useMemo(() => {
        if (useEmbeddedSubtitles && selectedTextTrack >= 0) {
            return { type: 'index', value: selectedTextTrack } as SelectedTrack;
        }
        return undefined;
    }, [useEmbeddedSubtitles, selectedTextTrack]);

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
            <Video
                ref={videoRef}
                source={{ uri: videoUrl }}
                style={styles.video}
                paused={isPaused}
                muted={settings.isMuted}
                rate={settings.playbackSpeed}
                resizeMode={contentFit}
                onLoad={handleLoad}
                onProgress={handleProgress}
                onBuffer={handleBuffer}
                onError={handleError}
                onLoadStart={handleLoadStart}
                onEnd={handleEnd}
                onAudioTracks={handleAudioTracks}
                onTextTracks={handleTextTracks}
                progressUpdateInterval={250}
                selectedAudioTrack={selectedAudioTrack >= 0 ? { type: 'index', value: selectedAudioTrack } as SelectedTrack : undefined}
                selectedTextTrack={videoSelectedTextTrack}
                controls={false}
                fullscreen={isFullscreen}
                enterPictureInPictureOnLeave={true}
                playInBackground={false}
                playWhenInactive={false}
                allowsExternalPlayback={true}
                onFullscreenPlayerWillPresent={() => setIsFullscreen(true)}
                onFullscreenPlayerWillDismiss={() => setIsFullscreen(false)}
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

            {useCustomSubtitles && subtitleState.currentSubtitle && (
                <SubtitleDisplay
                    subtitle={subtitleState.currentSubtitle}
                    position={settings.subtitlePosition}
                />
            )}

            {/* IntroDB skip banner */}
            {tvShow && (
                <SkipBanner
                    activeSegment={activeSegment}
                    onSkip={skipSegment}
                />
            )}

            {uiState.showControls && (
                <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]} pointerEvents="box-none">
                    <View style={styles.topControls}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                        </View>

                        <GlassView glassEffectStyle="clear" style={styles.topRightControls}>
                            {/* KSPlayer fallback button */}
                            {Platform.OS === 'ios' && onForceSwitchToKSPlayer && (
                                <TouchableOpacity style={styles.controlButton} onPress={onForceSwitchToKSPlayer}>
                                    <MaterialIcons name="switch-video" size={22} color="white" />
                                </TouchableOpacity>
                            )}

                            {streams.length > 1 && (
                                <MenuWrapper
                                    style={{ zIndex: 1000 }}
                                    ref={streamMenuRef}
                                    title="Select Stream"
                                    onPressAction={Platform.OS === 'web' ? handleWebAction : handleNativeAction}
                                    actions={streamActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={handleMenuOpen}
                                    onCloseMenu={handleMenuClose}
                                >
                                    <TouchableOpacity style={styles.controlButton} onPress={() => {
                                        if (Platform.OS === 'android') streamMenuRef.current?.show();
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

                            {Platform.OS !== 'web' && playerState.isReady && (
                                <TouchableOpacity style={styles.controlButton} onPress={goToFullscreen}>
                                    <MaterialIcons name={isFullscreen ? "fullscreen-exit" : "fullscreen"} size={24} color="white" />
                                </TouchableOpacity>
                            )}

                            {availableAudioTracks.length > 0 && (
                                <MenuWrapper
                                    style={{ zIndex: 1000 }}
                                    title="Audio Track"
                                    ref={audioMenuRef}
                                    onPressAction={Platform.OS === 'web' ? handleWebAction : handleNativeAction}
                                    actions={audioActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={handleMenuOpen}
                                    onCloseMenu={handleMenuClose}
                                >
                                    <TouchableOpacity style={styles.controlButton} onPress={() => {
                                        if (Platform.OS === 'android') audioMenuRef.current?.show();
                                    }}>
                                        <MaterialIcons name="multitrack-audio" size={24} color="white" />
                                    </TouchableOpacity>
                                </MenuWrapper>
                            )}

                            {(subtitles.length > 0 || availableTextTracks.length > 0) && (
                                <MenuWrapper
                                    style={{ zIndex: 1000 }}
                                    title="Subtitles"
                                    ref={subtitleMenuRef}
                                    onPressAction={Platform.OS === 'web' ? handleWebAction : handleNativeAction}
                                    actions={subtitleActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={handleMenuOpen}
                                    onCloseMenu={handleMenuClose}
                                >
                                    <TouchableOpacity style={styles.controlButton} onPress={() => {
                                        if (Platform.OS === 'android') subtitleMenuRef.current?.show();
                                    }}>
                                        <MaterialIcons name="closed-caption" size={24} color="white" />
                                    </TouchableOpacity>
                                </MenuWrapper>
                            )}

                            <MenuWrapper
                                style={{ zIndex: 1000 }}
                                title="Settings"
                                ref={settingsMenuRef}
                                onPressAction={Platform.OS === 'web' ? handleWebAction : handleNativeAction}
                                actions={settingsActions}
                                shouldOpenOnLongPress={false}
                                themeVariant="dark"
                                onOpenMenu={handleMenuOpen}
                                onCloseMenu={handleMenuClose}
                            >
                                <TouchableOpacity style={styles.controlButton} onPress={() => {
                                    if (Platform.OS === 'android') settingsMenuRef.current?.show();
                                }}>
                                    <MaterialIcons name="settings" size={24} color="white" />
                                </TouchableOpacity>
                            </MenuWrapper>
                        </GlassView>
                    </View>

                    <CenterControls
                        isPlaying={!isPaused}
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