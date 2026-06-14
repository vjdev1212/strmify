import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TouchableOpacity, View as RNView, Animated, Platform, Dimensions } from "react-native";
import Video, { OnLoadData, OnProgressData, VideoRef, OnBufferData, ResizeMode, SelectedTrack, TextTrackType, OnPlaybackStateChangedData } from "react-native-video";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import ContextMenu from 'react-native-context-menu-view';
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
    SUBTITLE_DELAY_VALUES,
    loadSubtitle,
    handleSubtitleError,
    findActiveSubtitleWithDelay,
    performSeek,
    buildSettingsActions,
    buildSubtitleActionsLegacy,
    buildAudioActions,
    buildStreamActions,
    calculateSliderValues,
    ArtworkBackground,
    WaitingLobby,
    SubtitleDisplay,
    CenterControls,
    ProgressBar,
    SubtitleSource,
    SubtitlePosition,
    ErrorDisplay,
    ExtendedMediaPlayerProps
} from "../coreplayer";
import { View, Text } from "../Themed";
import { GlassView } from 'expo-glass-effect';
import { SkipBanner } from "../introdb/skipBanner";
import { useIntroDB } from "../introdb/useIntroDb";

export const MediaPlayer: React.FC<ExtendedMediaPlayerProps> = ({
    videoUrl,
    title,
    back: onBack,
    resumePositionSeconds = 0,
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

    const useCustomSubtitles = subtitles.length > 0 && !useEmbeddedSubtitles;

    // Restore playback position
    useEffect(() => {
        if (!playerState.isReady || playerState.duration <= 0 || resumePositionSeconds <= 0) {
            return;
        }

        const currentTime = Math.min(resumePositionSeconds, playerState.duration);
        isSeeking.current = true;
        wasPlayingBeforeSeek.current = false;

        videoRef.current?.seek(currentTime);
        playerState.setCurrentTime(currentTime);
        lastKnownTimeRef.current = currentTime;

        const timeoutId = setTimeout(() => {
            isSeeking.current = false;
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [playerState.isReady, playerState.duration, resumePositionSeconds]);

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
                updateProgress({
                    positionSeconds: lastKnownTimeRef.current,
                    durationSeconds: playerState.duration
                });
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

    // Playback position update interval
    useEffect(() => {
        if (!updateProgress || !playerState.isReady || playerState.duration <= 0) return;

        progressUpdateTimerRef.current = setInterval(() => {
            if (lastKnownTimeRef.current > 0 && playerState.duration > 0) {
                updateProgress({
                    positionSeconds: lastKnownTimeRef.current,
                    durationSeconds: playerState.duration
                });
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
        if (playerState.isReady && !isPaused) {
            showControlsTemporarily();
        }
    }, [playerState.isReady]);

    useEffect(() => {
        playerState.setIsPlaying(playerState.isReady && !isPaused);
    }, [isPaused, playerState.isReady, playerState.setIsPlaying]);

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

    const handlePlaybackStateChanged = useCallback((data: OnPlaybackStateChangedData) => {
        playerState.setIsPlaying(data.isPlaying);
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
        setIsPaused((wasPaused) => {
            const nextPaused = !wasPaused;
            playerState.setIsPlaying(!nextPaused);
            return nextPaused;
        });
        showControlsTemporarily();
    }, [playerState, showControlsTemporarily]);

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

    // Offset-index scheme: 0..subtitles.length-1 = custom, subtitles.length.. = embedded, -1 = off
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

    // Offset-index ids preserved internally via handleSubtitleTrackSelect(number)
    const subtitleActions = useMemo(() => {
        const adaptedTracks = adaptTextTracks(availableTextTracks);
        let currentSelection = -1;
        if (useEmbeddedSubtitles && selectedTextTrack >= 0) {
            currentSelection = subtitles.length + selectedTextTrack;
        } else if (!useEmbeddedSubtitles && settings.selectedSubtitle >= 0) {
            currentSelection = settings.selectedSubtitle;
        }
        return buildSubtitleActionsLegacy(
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
        onBack({
            message: '',
            positionSeconds: lastKnownTimeRef.current,
            durationSeconds: playerState.duration,
            player: "native"
        });
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

    // ─── Context menu press handlers ──────────────────────────────────────────

    const handleSettingsMenuPress = useCallback(({ nativeEvent }: any) => {
        const { indexPath } = nativeEvent;
        if (indexPath && indexPath.length === 2 && indexPath[0] === 0) {
            const speed = CONSTANTS.PLAYBACK_SPEEDS[indexPath[1]];
            if (speed !== undefined) handlePlaybackSpeedSelect(speed);
        }
        showControlsTemporarily();
    }, [handlePlaybackSpeedSelect, showControlsTemporarily]);

    const handleSubtitleMenuPress = useCallback(({ nativeEvent }: any) => {
        const { indexPath } = nativeEvent;
        if (!indexPath || indexPath.length !== 2) { showControlsTemporarily(); return; }
        const [groupIndex, itemIndex] = indexPath;

        if (groupIndex === 0) {
            // Tracks order matches buildSubtitleActionsLegacy: [Off, ...custom, ...embedded]
            if (itemIndex === 0) {
                handleSubtitleTrackSelect(-1);
            } else if (itemIndex <= subtitles.length) {
                handleSubtitleTrackSelect(itemIndex - 1);
            } else {
                const embeddedIndex = itemIndex - 1 - subtitles.length;
                handleSubtitleTrackSelect(subtitles.length + embeddedIndex);
            }
        } else if (groupIndex === 1) {
            handleSubtitlePositionSelect(itemIndex as SubtitlePosition);
        } else if (groupIndex === 2) {
            const delay = SUBTITLE_DELAY_VALUES[itemIndex];
            if (delay !== undefined) handleSubtitleDelaySelect(delay);
        }
        showControlsTemporarily();
    }, [subtitles.length, handleSubtitleTrackSelect, handleSubtitlePositionSelect, handleSubtitleDelaySelect, showControlsTemporarily]);

    const handleStreamMenuPress = useCallback(({ nativeEvent }: any) => {
        if (nativeEvent.indexPath && nativeEvent.indexPath.length === 1) {
            handleStreamSelect(nativeEvent.indexPath[0]);
        }
        showControlsTemporarily();
    }, [handleStreamSelect, showControlsTemporarily]);

    const handleAudioMenuPress = useCallback(({ nativeEvent }: any) => {
        if (nativeEvent.indexPath && nativeEvent.indexPath.length === 1) {
            handleAudioSelect(nativeEvent.indexPath[0]);
        }
        showControlsTemporarily();
    }, [handleAudioSelect, showControlsTemporarily]);

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
    const videoSource = useMemo(() => ({ uri: videoUrl }), [videoUrl]);
    const videoSelectedAudioTrack: SelectedTrack | undefined = useMemo(() => (
        selectedAudioTrack >= 0 ? { type: 'index', value: selectedAudioTrack } as SelectedTrack : undefined
    ), [selectedAudioTrack]);

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
                source={videoSource}
                style={styles.video}
                paused={isPaused}
                muted={settings.isMuted}
                rate={settings.playbackSpeed}
                resizeMode={contentFit}
                onLoad={handleLoad}
                onProgress={handleProgress}
                onPlaybackStateChanged={handlePlaybackStateChanged}
                onBuffer={handleBuffer}
                onError={handleError}
                onLoadStart={handleLoadStart}
                onEnd={handleEnd}
                onAudioTracks={handleAudioTracks}
                onTextTracks={handleTextTracks}
                progressUpdateInterval={250}
                selectedAudioTrack={videoSelectedAudioTrack}
                selectedTextTrack={videoSelectedTextTrack}
                controls={false}
                enterPictureInPictureOnLeave={true}
                playInBackground={false}
                playWhenInactive={false}
                allowsExternalPlayback={true}
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
                                <ContextMenu
                                    title="Select Stream"
                                    actions={streamActions}
                                    onPress={handleStreamMenuPress}
                                    previewBackgroundColor="transparent"
                                >
                                    <RNView style={styles.controlButton}>
                                        <MaterialIcons name="ondemand-video" size={24} color="white" />
                                    </RNView>
                                </ContextMenu>
                            )}

                            <TouchableOpacity style={styles.controlButton} onPress={handleMuteToggle}>
                                <Ionicons name={settings.isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.controlButton} onPress={cycleContentFit}>
                                <MaterialIcons name={getContentFitIcon()} size={24} color="white" />
                            </TouchableOpacity>

                            {availableAudioTracks.length > 0 && (
                                <ContextMenu
                                    title="Audio Track"
                                    actions={audioActions}
                                    onPress={handleAudioMenuPress}
                                    previewBackgroundColor="transparent"
                                >
                                    <RNView style={styles.controlButton}>
                                        <MaterialIcons name="multitrack-audio" size={24} color="white" />
                                    </RNView>
                                </ContextMenu>
                            )}

                            {(subtitles.length > 0 || availableTextTracks.length > 0) && (
                                <ContextMenu
                                    title="Subtitles"
                                    actions={subtitleActions}
                                    onPress={handleSubtitleMenuPress}
                                    previewBackgroundColor="transparent"
                                >
                                    <RNView style={styles.controlButton}>
                                        <MaterialIcons name="closed-caption" size={24} color="white" />
                                    </RNView>
                                </ContextMenu>
                            )}

                            <ContextMenu
                                title="Settings"
                                actions={settingsActions}
                                onPress={handleSettingsMenuPress}
                                previewBackgroundColor="transparent"
                            >
                                <RNView style={styles.controlButton}>
                                    <MaterialIcons name="settings" size={24} color="white" />
                                </RNView>
                            </ContextMenu>
                        </GlassView>
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
        </View>
    );
};