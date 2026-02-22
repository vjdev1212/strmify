import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TouchableOpacity, Animated, Platform } from "react-native";
import { VLCPlayer } from 'react-native-vlc-media-player';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { MenuComponentRef, MenuView } from '@react-native-menu/menu';
import ImmersiveMode from "react-native-immersive-mode";
import { View, Text } from "../Themed";
import { styles } from "../coreplayer/styles";
import {
    ArtworkBackground,
    WaitingLobby,
    buildAudioActions,
    buildSettingsActions,
    buildSubtitleActions,
    calculateProgress,
    calculateSliderValues,
    CenterControls,
    CONSTANTS,
    ErrorDisplay,
    findActiveSubtitleWithDelay,
    handleSubtitleError,
    hideControls,
    loadSubtitle,
    performSeek,
    ProgressBar,
    SubtitleDisplay,
    SubtitleSource,
    SubtitlePosition,
    usePlayerAnimations,
    useEnhancedPlayerSettings,
    usePlayerState,
    useSubtitleState,
    useTimers,
    useUIState,
    ExtendedMediaPlayerProps,
    buildStreamActions
} from "../coreplayer";
import { GlassView } from 'expo-glass-effect';
import { SkipBanner } from "../coreplayer/skipBanner";
import { useIntroDB } from "../introdb/useIntroDb";

export interface TVShowMetadata {
    imdbId: string;
    season: number;
    episode: number;
}

export interface ExtendedMediaPlayerPropsWithTV extends ExtendedMediaPlayerProps {
    tvShow?: TVShowMetadata;
}

const useVLCPlayerState = () => {
    const baseState = usePlayerState();
    const [isPaused, setIsPaused] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showBufferingLoader, setShowBufferingLoader] = useState(false);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const [availableAudioTracks, setAvailableAudioTracks] = useState<any[]>([]);
    const [availableTextTracks, setAvailableTextTracks] = useState<any[]>([]);
    const [selectedVLCTextTrack, setSelectedVLCTextTrack] = useState<number>(-100);

    return {
        ...baseState,
        isPaused, setIsPaused,
        error, setError,
        showBufferingLoader, setShowBufferingLoader,
        hasStartedPlaying, setHasStartedPlaying,
        isSeeking, setIsSeeking,
        availableAudioTracks, setAvailableAudioTracks,
        availableTextTracks, setAvailableTextTracks,
        selectedVLCTextTrack, setSelectedVLCTextTrack
    };
};

const VlcMediaPlayerComponent: React.FC<ExtendedMediaPlayerPropsWithTV> = ({
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
    onStreamChange,
    tvShow,
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
    const settings = useEnhancedPlayerSettings();
    const timers = useTimers();
    const animations = usePlayerAnimations();

    const [zoom, setZoom] = useState(1.0);
    const [isChangingStream, setIsChangingStream] = useState(false);
    const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);

    const audioMenuRef = useRef<MenuComponentRef>(null);
    const subtitleMenuRef = useRef<MenuComponentRef>(null);
    const settingsMenuRef = useRef<MenuComponentRef>(null);
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

    const useCustomSubtitles = subtitles.length > 0;

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

    useEffect(() => {
        if (Platform.OS === "android") {
            ImmersiveMode.fullLayout(true);
        }
        return () => {
            if (updateProgress) {
                const prog = calculateProgress(playerState.currentTime, playerState.duration);
                updateProgress({ progress: prog });
            }
            timers.clearAllTimers();
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

    useEffect(() => {
        if (videoUrl !== currentVideoUrl) {
            console.log('Stream change detected');
            setIsChangingStream(true);
            playerState.setIsPaused(true);

            requestAnimationFrame(() => {
                playerState.setIsPlaying(false);
                playerState.setIsPaused(false);
                playerState.setIsBuffering(true);
                playerState.setIsReady(false);
                playerState.setHasStartedPlaying(false);
                playerState.setShowBufferingLoader(true);
                playerState.setCurrentTime(0);
                playerState.setIsSeeking(false);
                playerState.setError(null);
            });

            Animated.timing(animations.bufferOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();

            setTimeout(() => {
                setCurrentVideoUrl(videoUrl);
                setIsChangingStream(false);
            }, 300);
        }
    }, [videoUrl, currentVideoUrl]);

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

    useEffect(() => {
        if (subtitleState.parsedSubtitles.length === 0 || !playerState.isPlaying || playerState.selectedVLCTextTrack >= 0) {
            if (subtitleIntervalRef.current) {
                clearInterval(subtitleIntervalRef.current);
                subtitleIntervalRef.current = null;
            }
            subtitleState.setCurrentSubtitle('');
            return;
        }

        const updateSubtitle = () => {
            const text = findActiveSubtitleWithDelay(
                playerState.currentTime,
                subtitleState.parsedSubtitles,
                settings.subtitleDelay
            );
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
    }, [subtitleState.parsedSubtitles, playerState.isPlaying, playerState.currentTime, playerState.selectedVLCTextTrack]);

    // seekTo for VLC — position is 0-1 ratio
    const seekTo = useCallback((seconds: number) => {
        if (!playerRef.current || playerState.duration <= 0) return;
        const clampedTime = performSeek(seconds, playerState.duration);
        const position = clampedTime / playerState.duration;

        console.log("[IntroDB] Seeking VLC to", clampedTime, "s (position", position + ")");

        isSeeking.current = true;
        playerRef.current?.seek(position);

        requestAnimationFrame(() => {
            playerState.setIsSeeking(true);
            playerState.setIsBuffering(true);
            playerState.setCurrentTime(clampedTime);
            progressBarValue.setValue(position);

            Animated.timing(animations.bufferOpacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }).start();
        });

        showControlsTemporarily();
    }, [playerState, showControlsTemporarily, progressBarValue, animations.bufferOpacity]);

    // ---- IntroDB segment skipping ----
    const { activeSegment, skip: skipSegment } = useIntroDB({
        imdbId: tvShow ? tvShow.imdbId : null,
        season: tvShow ? tvShow.season : null,
        episode: tvShow ? tvShow.episode : null,
        currentTime: playerState.currentTime,
        onSkip: seekTo,
    });

    const vlcHandlers = useMemo(() => ({
        onLoad: (data: any) => {
            console.log('VLC onLoad');
            console.log('VLC onLoad data:', data);
            console.log('progress', progress);

            requestAnimationFrame(() => {
                playerState.setIsBuffering(false);
                playerState.setIsReady(true);
                playerState.setError(null);
                playerState.setHasStartedPlaying(true);
                playerState.setIsPlaying(true);
                playerState.setIsPaused(false);
                playerState.setShowBufferingLoader(false);
                playerState.setIsSeeking(false);
                setIsChangingStream(false);

                if (data?.audioTracks) {
                    console.log('Audio tracks:', data.audioTracks);
                    playerState.setAvailableAudioTracks(data.audioTracks);
                }
                if (data?.textTracks) {
                    console.log('Text tracks:', data.textTracks);
                    const validTracks = data.textTracks.filter((track: any) => track.id !== -1);
                    playerState.setAvailableTextTracks(validTracks);
                }
                if (data?.duration) {
                    const durationInSeconds = data.duration / 1000;
                    playerState.setDuration(durationInSeconds);
                }
                if (progress && progress > 0 && !isChangingStream) {
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

            const now = Date.now();
            if (now - lastProgressUpdateRef.current < 250) {
                if (stateRefs.current.duration > 0) {
                    const p = newCurrentTime / stateRefs.current.duration;
                    progressBarValue.setValue(Math.max(0, Math.min(1, p)));
                }
                return;
            }

            lastProgressUpdateRef.current = now;
            playerState.setCurrentTime(newCurrentTime);

            if (playerState.duration === 0 && dur > 0) {
                playerState.setDuration(dur / 1000);
            }

            if (stateRefs.current.duration > 0) {
                const p = newCurrentTime / stateRefs.current.duration;
                progressBarValue.setValue(Math.max(0, Math.min(1, p)));
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
                errorMessage = "Unable to load the video. " + error.error;
            }
            requestAnimationFrame(() => {
                playerState.setError(errorMessage);
                playerState.setIsBuffering(false);
                playerState.setIsReady(false);
                playerState.setShowBufferingLoader(false);
            });
        }
    }), [playerState, animations.bufferOpacity, progressBarValue]);

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
                const prog = calculateProgress(playerState.currentTime, playerState.duration);
                updateProgress({ progress: prog });
            }
        }, 1 * 60 * 1000);

        return () => {
            if (progressUpdateTimerRef.current) {
                clearInterval(progressUpdateTimerRef.current);
                progressUpdateTimerRef.current = null;
            }
        };
    }, [playerState.isReady, playerState.duration]);

    useEffect(() => {
        if (playerState.isPlaying && uiState.showControls && shouldAutoHideControls.current) {
            showControlsTemporarily();
        }
    }, [playerState.isPlaying]);

    const handleZoomIn = useCallback(() => {
        setZoom(prev => Math.round(Math.min(prev + 0.05, 1.5) * 100) / 100);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleZoomOut = useCallback(() => {
        setZoom(prev => Math.round(Math.max(prev - 0.05, 1.0) * 100) / 100);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const togglePlayPause = useCallback(() => {
        if (!playerState.isReady) return;
        const newPausedState = !playerState.isPaused;
        playerState.setIsPaused(newPausedState);
        playerState.setIsPlaying(!newPausedState);
        showControlsTemporarily();
    }, [playerState.isReady, playerState.isPaused, playerState, showControlsTemporarily]);

    const skipTime = useCallback((seconds: number) => {
        if (!playerState.isReady) return;
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

    const handlePlaybackSpeedSelect = useCallback((speed: number) => {
        settings.setPlaybackSpeed(speed);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const handleSubtitleTrackSelect = useCallback((index: number) => {
        console.log('Selecting custom subtitle (OpenSubtitles):', index);
        settings.setSelectedSubtitle(index);
        if (index >= 0) {
            playerState.setSelectedVLCTextTrack(-1);
        }
    }, [settings, playerState]);

    const handleVLCTextTrackSelect = useCallback((trackId: number) => {
        console.log('Selecting VLC text track with ID:', trackId);
        playerState.setSelectedVLCTextTrack(trackId);
        if (trackId >= 0) {
            settings.setSelectedSubtitle(-1);
            subtitleState.setCurrentSubtitle('');
            subtitleState.setParsedSubtitles([]);
        }
        showControlsTemporarily();
    }, [playerState, settings, subtitleState, showControlsTemporarily]);

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
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const handleStreamSelect = useCallback((index: number) => {
        if (onStreamChange && index !== currentStreamIndex) {
            setIsChangingStream(true);
            playerState.setIsBuffering(true);
            playerState.setHasStartedPlaying(false);
            playerState.setIsPaused(true);
            onStreamChange(index);
        }
        showControlsTemporarily();
    }, [onStreamChange, currentStreamIndex, showControlsTemporarily, playerState]);

    const settingsActions = useMemo(() => buildSettingsActions(settings.playbackSpeed), [settings.playbackSpeed]);

    const subtitleActions = useMemo(() =>
        buildSubtitleActions(
            subtitles as SubtitleSource[],
            settings.selectedSubtitle,
            useCustomSubtitles,
            playerState.availableTextTracks,
            settings.subtitlePosition,
            settings.subtitleDelay,
            playerState.selectedVLCTextTrack
        ),
        [subtitles, settings.selectedSubtitle, useCustomSubtitles, playerState.availableTextTracks, settings.subtitlePosition, settings.subtitleDelay, playerState.selectedVLCTextTrack]
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

    const handleBack = useCallback(() => {
        const prog = calculateProgress(playerState.currentTime, playerState.duration);
        onBack({ message: '', progress: prog, player: "vlc" });
    }, [playerState.currentTime, playerState.duration, onBack]);

    const handleMenuAction = useCallback((id: string) => {
        console.log('Menu action:', id);
        if (id.startsWith('speed-')) {
            const speed = parseFloat(id.split('-')[1]);
            if (!isNaN(speed)) handlePlaybackSpeedSelect(speed);
        } else if (id === 'subtitle-track-off') {
            handleSubtitleTrackSelect(-1);
            playerState.setSelectedVLCTextTrack(-1);
        } else if (id.startsWith('subtitle-track-')) {
            const index = parseInt(id.split('subtitle-track-')[1]);
            if (!isNaN(index)) handleSubtitleTrackSelect(index);
        } else if (id.startsWith('vlc-text-track-')) {
            const trackId = parseInt(id.split('vlc-text-track-')[1]);
            if (!isNaN(trackId)) handleVLCTextTrackSelect(trackId);
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
    }, [handlePlaybackSpeedSelect, handleSubtitleTrackSelect, handleVLCTextTrackSelect, handleSubtitlePositionSelect, handleSubtitleDelaySelect, handleAudioSelect, handleStreamSelect, playerState]);

    const handleMenuOpen = useCallback(() => {
        shouldAutoHideControls.current = false;
        timers.clearTimer('hideControls');
    }, [timers]);

    const handleMenuClose = useCallback(() => {
        shouldAutoHideControls.current = true;
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleMuteToggle = useCallback(() => {
        settings.setIsMuted(!settings.isMuted);
        showControlsTemporarily();
    }, [settings, showControlsTemporarily]);

    const handleSkipBackward = useCallback(() => skipTime(-10), [skipTime]);
    const handleSkipForward = useCallback(() => skipTime(30), [skipTime]);

    const displaySubtitle = useMemo(() => {
        if (playerState.selectedVLCTextTrack >= 0) return '';
        return useCustomSubtitles ? subtitleState.currentSubtitle : '';
    }, [playerState.selectedVLCTextTrack, useCustomSubtitles, subtitleState.currentSubtitle]);

    return (
        <View style={styles.container}>
            <VLCPlayer
                ref={playerRef}
                style={[styles.video, { transform: [{ scale: zoom }] }]}
                source={{
                    uri: currentVideoUrl,
                    initType: 2,
                    initOptions: [
                        '--avcodec-fast',
                        '--avcodec-skiploopfilter=4',
                        '--avcodec-skip-frame=0',
                        '--avcodec-skip-idct=0',
                        '--network-caching=1000',
                        '--no-audio-time-stretch',
                        '--prefetch-buffer-size=2048',
                        '--prefetch-read-size=1024',
                        '--sub-text-scale=45',
                        '--sub-margin=65',
                    ]
                }}
                autoplay={true}
                playInBackground={true}
                autoAspectRatio={true}
                resizeMode="cover"
                textTrack={playerState.selectedVLCTextTrack}
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
                isBuffering={playerState.isBuffering || isChangingStream}
                hasStartedPlaying={playerState.hasStartedPlaying && !isChangingStream}
                error={!!playerState.error}
            />

            <WaitingLobby
                hasStartedPlaying={playerState.hasStartedPlaying && !isChangingStream}
                opacity={animations.bufferOpacity}
                error={!!playerState.error}
            />

            <TouchableOpacity style={styles.touchArea} activeOpacity={1} onPress={handleOverlayPress} />

            <SubtitleDisplay
                subtitle={displaySubtitle}
                position={settings.subtitlePosition}
                error={!!playerState.error}
            />

            {/* IntroDB skip banner */}
            {tvShow && (
                <SkipBanner
                    activeSegment={activeSegment}
                    onSkip={skipSegment}
                />
            )}

            {uiState.showControls && (
                <Animated.View style={[styles.controlsOverlay, { opacity: animations.controlsOpacity }]} pointerEvents="box-none">
                    <View style={styles.topControls}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                        </View>

                        <GlassView glassEffectStyle="clear" style={styles.topRightControls}>
                            {streams.length > 1 && (
                                <MenuView
                                    ref={streamMenuRef}
                                    title="Select Stream"
                                    onPressAction={({ nativeEvent }) => handleMenuAction(nativeEvent.event)}
                                    actions={streamActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={handleMenuOpen}
                                    onCloseMenu={handleMenuClose}
                                >
                                    <TouchableOpacity
                                        style={styles.controlButton}
                                        onPress={() => { if (Platform.OS === 'android') streamMenuRef.current?.show(); }}
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

                            <TouchableOpacity style={styles.controlButton} onPress={handleMuteToggle}>
                                <Ionicons name={settings.isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
                            </TouchableOpacity>

                            {playerState.availableAudioTracks.length > 0 && (
                                <MenuView
                                    ref={audioMenuRef}
                                    title="Audio Track"
                                    onPressAction={({ nativeEvent }) => {
                                        const index = audioActions.findIndex((a: any) => a.id === nativeEvent.event);
                                        if (index !== -1) handleAudioSelect(index);
                                    }}
                                    actions={audioActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={handleMenuOpen}
                                    onCloseMenu={handleMenuClose}
                                >
                                    <TouchableOpacity
                                        style={styles.controlButton}
                                        onPress={() => { if (Platform.OS === 'android') audioMenuRef.current?.show(); }}
                                    >
                                        <MaterialIcons name="multitrack-audio" size={24} color="white" />
                                    </TouchableOpacity>
                                </MenuView>
                            )}

                            {(subtitles.length > 0 || playerState.availableTextTracks.length > 0) && (
                                <MenuView
                                    style={{ zIndex: 1000 }}
                                    title="Subtitles"
                                    ref={subtitleMenuRef}
                                    onPressAction={({ nativeEvent }) => handleMenuAction(nativeEvent.event)}
                                    actions={subtitleActions}
                                    shouldOpenOnLongPress={false}
                                    themeVariant="dark"
                                    onOpenMenu={handleMenuOpen}
                                    onCloseMenu={handleMenuClose}
                                >
                                    <TouchableOpacity
                                        style={styles.controlButton}
                                        onPress={() => { if (Platform.OS === 'android') subtitleMenuRef.current?.show(); }}
                                    >
                                        <MaterialIcons name="closed-caption" size={24} color="white" />
                                    </TouchableOpacity>
                                </MenuView>
                            )}

                            <MenuView
                                ref={settingsMenuRef}
                                title="Settings"
                                onPressAction={({ nativeEvent }) => handleMenuAction(nativeEvent.event)}
                                actions={settingsActions}
                                shouldOpenOnLongPress={false}
                                themeVariant="dark"
                                onOpenMenu={handleMenuOpen}
                                onCloseMenu={handleMenuClose}
                            >
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={() => { if (Platform.OS === 'android') settingsMenuRef.current?.show(); }}
                                >
                                    <MaterialIcons name="settings" size={24} color="white" />
                                </TouchableOpacity>
                            </MenuView>
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
