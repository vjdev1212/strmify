import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, ActivityIndicator, Image, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-assets/slider';
import { showAlert } from '@/utils/platform';
import { parseSubtitleFile } from './subtitle';
import { styles } from './styles';
import { formatTime } from './utils';
import { MediaPlayerProps } from './models';
import { extractAudioCodec, extractHDR, extractQuality, extractSize, extractSource, extractVideoCodec } from '@/utils/StreamItem';
import { MenuAction } from '@react-native-menu/menu';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ResizeMode } from 'react-native-video';
import { GlassView } from 'expo-glass-effect';

// ==================== CONSTANTS ====================
export const CONSTANTS = {
    CONTROLS_AUTO_HIDE_DELAY: 3000,
    CONTENT_FIT_LABEL_DELAY: 1000,
    SUBTITLE_UPDATE_INTERVAL: 50,
    PLAYBACK_SPEEDS: [0.25, 0.50, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.1, 1.15, 1.20, 1.25, 1.50, 1.75, 2.0],
    CONTENT_FIT_OPTIONS: ['contain', 'cover', 'fill'] as const,
    RN_VIDEO_CONTENT_FIT_OPTIONS: [ResizeMode.CONTAIN, ResizeMode.COVER, ResizeMode.STRETCH]
};

export type SubtitlePosition = number;

// ==================== TYPES ====================

interface Stream {
    name: string;
    title?: string;
    url?: string;
    embed?: string;
    infoHash?: string;
    magnet?: string;
    magnetLink?: string;
    description?: string;
}
export interface ExtendedMediaPlayerProps extends MediaPlayerProps {
    streams?: Stream[];
    currentStreamIndex?: number;
    onStreamChange?: (index: number) => void;
}

export interface SubtitleSource {
    fileId?: string;
    url?: string;
    language?: string;
    label: string;
}

export interface DownloadResponse {
    link: string;
}

// ==================== HOOKS ====================

// Common player state hook
export const usePlayerState = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);

    return {
        isPlaying, setIsPlaying,
        currentTime, setCurrentTime,
        duration, setDuration,
        isBuffering, setIsBuffering,
        isReady, setIsReady,
        isDragging, setIsDragging,
        dragPosition, setDragPosition
    };
};

// Common subtitle state hook
export const useSubtitleState = () => {
    const [currentSubtitle, setCurrentSubtitle] = useState('');
    const [parsedSubtitles, setParsedSubtitles] = useState<any[]>([]);
    const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);

    return {
        currentSubtitle, setCurrentSubtitle,
        parsedSubtitles, setParsedSubtitles,
        isLoadingSubtitles, setIsLoadingSubtitles
    };
};

// Common UI state hook
export const useUIState = () => {
    const [showControls, setShowControls] = useState(true);
    const [preventAutoHide, setPreventAutoHide] = useState(false);

    return {
        showControls, setShowControls,
        preventAutoHide, setPreventAutoHide
    };
};

// Common player settings hook
export const usePlayerSettings = () => {
    const [isMuted, setIsMuted] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [selectedSubtitle, setSelectedSubtitle] = useState(-1);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState(-1);

    return {
        isMuted, setIsMuted,
        playbackSpeed, setPlaybackSpeed,
        selectedSubtitle, setSelectedSubtitle,
        selectedAudioTrack, setSelectedAudioTrack
    };
};

// Enhanced player settings hook with subtitle positioning and delay
export const useEnhancedPlayerSettings = () => {
    const baseSettings = usePlayerSettings();
    const [subtitleDelay, setSubtitleDelay] = useState(0);
    const [subtitlePosition, setSubtitlePosition] = useState<number>(0);

    return {
        ...baseSettings,
        subtitleDelay,
        setSubtitleDelay,
        subtitlePosition,
        setSubtitlePosition
    };
};

// Common timer management hook
export const useTimers = () => {
    const timersRef = useRef<{
        hideControls: ReturnType<typeof setTimeout> | null;
        buffering: ReturnType<typeof setTimeout> | null;
        contentFitLabel: ReturnType<typeof setTimeout> | null;
        progressDebounce: ReturnType<typeof setTimeout> | null;
        seekDebounce: ReturnType<typeof setTimeout> | null;
        bufferingTimeout: ReturnType<typeof setTimeout> | null;
        doubleTap: ReturnType<typeof setTimeout> | null;
    }>({
        hideControls: null,
        buffering: null,
        contentFitLabel: null,
        progressDebounce: null,
        seekDebounce: null,
        bufferingTimeout: null,
        doubleTap: null
    });

    const clearTimer = useCallback((timerName: keyof typeof timersRef.current) => {
        if (timersRef.current[timerName]) {
            clearTimeout(timersRef.current[timerName]!);
            timersRef.current[timerName] = null;
        }
    }, []);

    const setTimer = useCallback((
        timerName: keyof typeof timersRef.current,
        callback: () => void,
        delay: number
    ) => {
        clearTimer(timerName);
        timersRef.current[timerName] = setTimeout(callback, delay);
    }, [clearTimer]);

    const clearAllTimers = useCallback(() => {
        Object.keys(timersRef.current).forEach(key => {
            clearTimer(key as keyof typeof timersRef.current);
        });
    }, [clearTimer]);

    return { clearTimer, setTimer, clearAllTimers };
};

// Common animations hook
export const usePlayerAnimations = () => {
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;
    const contentFitLabelOpacity = useRef(new Animated.Value(0)).current;

    return {
        controlsOpacity,
        bufferOpacity,
        contentFitLabelOpacity
    };
};

// ==================== UTILITIES ====================

// Subtitle loading logic
export const loadSubtitle = async (
    subtitle: SubtitleSource,
    openSubtitlesClient?: any
): Promise<any[]> => {
    let subtitleContent = '';

    // Load from OpenSubtitles
    if (subtitle.fileId && openSubtitlesClient) {
        const response = await openSubtitlesClient.downloadSubtitle(String(subtitle.fileId));

        if ('error' in response || ('status' in response && response.status !== 200)) {
            throw new Error(response.message || 'Download failed');
        }

        const downloadResponse = response as DownloadResponse;
        if (!downloadResponse.link) {
            throw new Error('No download link');
        }

        const subResponse = await fetch(downloadResponse.link);
        if (!subResponse.ok) {
            throw new Error(`HTTP ${subResponse.status}`);
        }
        subtitleContent = await subResponse.text();
    }
    // Load from direct URL
    else if (subtitle.url && !subtitle.url.includes('opensubtitles.org')) {
        const response = await fetch(subtitle.url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        subtitleContent = await response.text();
    }
    else {
        throw new Error('No valid subtitle source');
    }

    return parseSubtitleFile(subtitleContent);
};

// Subtitle update logic
export const findActiveSubtitle = (
    currentTime: number,
    parsedSubtitles: any[]
): string => {
    if (parsedSubtitles.length === 0) return '';

    const active = parsedSubtitles.find(
        sub => currentTime >= sub.start && currentTime <= sub.end
    );

    return active?.text || '';
};

// Enhanced subtitle finding with delay support
export const findActiveSubtitleWithDelay = (
    currentTime: number,
    parsedSubtitles: any[],
    delay: number = 0
): string => {
    if (parsedSubtitles.length === 0) return '';

    const adjustedTime = currentTime + (delay / 1000);
    const active = parsedSubtitles.find(
        sub => adjustedTime >= sub.start && adjustedTime <= sub.end
    );

    return active?.text || '';
};

// Controls visibility management
export const hideControls = (
    setShowControls: (show: boolean) => void,
    controlsOpacity: Animated.Value
) => {
    Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
    }).start(() => setShowControls(false));
};

// Slider calculations
export const calculateSliderValues = (
    isDragging: boolean,
    dragPosition: number,
    currentTime: number,
    duration: number
) => {
    const displayTime = isDragging ? dragPosition * duration : currentTime;
    const sliderValue = isDragging ? dragPosition : (duration > 0 ? currentTime / duration : 0);

    return { displayTime, sliderValue };
};

// Seek functionality
export const performSeek = (
    seconds: number,
    duration: number
): number => {
    if (duration <= 0) return 0;
    return Math.max(0, Math.min(duration, seconds));
};

// Menu action builders
export const buildSettingsActions = (currentSpeed: number): MenuAction[] => {
    const speedActions = CONSTANTS.PLAYBACK_SPEEDS.map(speed => ({
        id: `speed-${speed}`,
        title: `${speed}x`,
        state: currentSpeed === speed ? ('on' as const) : undefined,
        titleColor: currentSpeed === speed ? '#007AFF' : '#FFFFFF',
    }));

    return [
        {
            id: 'settings-playback-speed',
            title: 'Playback Speed',
            image: Platform.select({
                ios: 'speedometer',
                default: undefined,
            }),
            imageColor: '#ffffff',
            subactions: speedActions,
        }
    ];
};

export const buildSubtitleTrackActions = (
    subtitles: SubtitleSource[],
    selectedIndex: number,
    useCustomSubtitles: boolean,
    availableSubtitleTracks?: any[]
): MenuAction[] => {
    const offAction = {
        id: 'subtitle-track-off',
        title: 'Off',
        state: selectedIndex === -1 ? ('on' as const) : undefined,
        titleColor: selectedIndex === -1 ? '#007AFF' : '#FFFFFF',
    };

    if (useCustomSubtitles) {
        return [
            offAction,
            ...subtitles.map((sub, i) => ({
                id: `subtitle-track-${i}`,
                title: sub.label,
                subtitle: sub.language ? `OpenSubtitles - ${sub.language.toUpperCase()}` : undefined,
                state: selectedIndex === i ? ('on' as const) : undefined,
                titleColor: selectedIndex === i ? '#007AFF' : '#FFFFFF',
            }))
        ];
    }

    return [
        offAction,
        ...(availableSubtitleTracks || []).map((sub, i) => ({
            id: `subtitle-track-${i}`,
            title: sub.label,
            state: selectedIndex === i ? ('on' as const) : undefined,
            titleColor: selectedIndex === i ? '#007AFF' : '#FFFFFF',
        }))
    ];
};

export const buildSubtitlePositionActions = (
    currentPosition: SubtitlePosition
): MenuAction[] => {
    const positions = [0, 1, 2, 3, 4, 5];
    return positions.map(pos => ({
        id: `position-${pos}`,
        title: pos === 0 ? 'Default' : `+${pos}`,
        state: currentPosition === pos ? ('on' as const) : undefined,
        titleColor: currentPosition === pos ? '#007AFF' : '#FFFFFF',
    }));
};

export const buildSubtitleDelayActions = (currentDelay: number): MenuAction[] => {
    const delays = [-5000, -4000, -3000, -2000, -1500, -1000, -750, -500, -250, -100, 0, 100, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000];

    return delays.map(delayMs => {
        const delaySec = delayMs / 1000;
        const isDefault = delayMs === 0;
        const prefix = delayMs > 0 ? '+' : '';

        return {
            id: `delay_${delayMs}`, // Use underscore instead of dash to avoid double-dash issue
            title: isDefault ? 'Default' : `${prefix}${delaySec.toFixed(Math.abs(delaySec) < 1 ? 2 : 1)}s`,
            state: currentDelay === delayMs ? ('on' as const) : undefined,
            titleColor: currentDelay === delayMs ? '#007AFF' : '#FFFFFF',
        };
    });
};

export const buildSubtitleActions = (
    subtitles: SubtitleSource[],
    selectedIndex: number,
    useCustomSubtitles: boolean,
    availableTextTracks: any[],
    subtitlePosition: SubtitlePosition,
    subtitleDelay: number,
    selectedTextTrackId: number = -1
): MenuAction[] => {
    // Build custom subtitle actions (OpenSubtitles)
    const customSubtitleActions: MenuAction[] = useCustomSubtitles
        ? subtitles.map((sub, i) => ({
            id: `subtitle-track-${i}`,
            title: sub.label,
            subtitle: sub.language ? `OpenSubtitles - ${sub.language.toUpperCase()}` : 'OpenSubtitles',
            state: selectedIndex === i && selectedTextTrackId === -1 ? ('on' as const) : undefined,
            titleColor: selectedIndex === i && selectedTextTrackId === -1 ? '#007AFF' : '#FFFFFF',
        }))
        : [];

    // Build embedded text track actions using track.id instead of index
    const vlcTextTrackActions: MenuAction[] = availableTextTracks
        .map((track) => ({
            id: `vlc-text-track-${track.id}`,
            title: track.label || track.name || `Track ${track.id}`,
            subtitle: 'Embedded',
            state: selectedTextTrackId === track.id ? ('on' as const) : undefined,
            titleColor: selectedTextTrackId === track.id ? '#007AFF' : '#FFFFFF',
        }));

    // Off action
    const offAction: MenuAction = {
        id: 'subtitle-track-off',
        title: 'Off',
        state: selectedIndex === -1 && selectedTextTrackId === -1 ? ('on' as const) : undefined,
        titleColor: selectedIndex === -1 && selectedTextTrackId === -1 ? '#007AFF' : '#FFFFFF',
    };

    // Combine all track actions
    const trackActions: MenuAction[] = [
        offAction,
        ...vlcTextTrackActions,
        ...customSubtitleActions
    ];

    const positionActions = buildSubtitlePositionActions(subtitlePosition);
    const delayActions = buildSubtitleDelayActions(subtitleDelay);

    return [
        {
            id: 'subtitle-tracks',
            title: 'Tracks',
            image: Platform.select({
                ios: 'text.bubble',
                default: undefined,
            }),
            imageColor: '#ffffff',
            subactions: trackActions,
        },
        {
            id: 'subtitle-position',
            title: 'Position',
            image: Platform.select({
                ios: 'arrow.up.and.down',
                default: undefined,
            }),
            imageColor: '#ffffff',
            subactions: positionActions,
        },
        {
            id: 'subtitle-delay',
            title: 'Delay',
            image: Platform.select({
                ios: 'clock',
                default: undefined,
            }),
            imageColor: '#ffffff',
            subactions: delayActions,
        }
    ];
};

export const buildStreamActions = (streams: Stream[], currentIndex: number): MenuAction[] => {
    return streams.map((stream, index) => {
        const name = stream.name || "";
        const title = stream.title || stream.description || "";

        const quality = extractQuality(name, title);
        const size = extractSize(title);
        const source = extractSource(title);
        const videoCodec = extractVideoCodec(title);
        const audioCodec = extractAudioCodec(title);
        const hdr = extractHDR(title);
        const audioChannels = extractAudioCodec(title);

        const parts: string[] = [];

        if (quality) parts.push(quality);
        if (size) parts.push(size);
        if (hdr) parts.push(hdr);
        if (audioCodec) parts.push(audioCodec);
        if (audioChannels) parts.push(audioChannels);
        if (source) parts.push(source);
        if (videoCodec) parts.push(videoCodec);

        const suffix = parts.join(" • ");
        const displayName = parts.length > 0 ? suffix : name;

        return {
            id: `stream-${index}`,
            title: displayName,
            subtitle: name,
            titleColor: '#ffffff',
            image: Platform.select({
                ios: 'play.circle',
                default: undefined,
            }),
            imageColor: '#ffffff',
            state: index === currentIndex ? ('on' as const) : 'off',
            attributes: {
                disabled: false,
            },
        };
    });
};

export const buildAudioActions = (
    audioTracks: any[],
    selectedTrackId: number
) => {
    return audioTracks.map((track) => ({
        id: `audio-${track.id}`,
        title: track.label || track.name || `Track ${track.id}`,
        state: selectedTrackId === track.id ? ('on' as const) : undefined,
        titleColor: selectedTrackId === track.id ? '#007AFF' : '#FFFFFF',
    }));
};

// Progress tracking
export const calculateProgress = (currentTime: number, duration: number): number => {
    if (duration <= 0) return 0;
    return Math.min((currentTime / duration) * 100, 100);
};

// Error handling
export const handleSubtitleError = (error: any) => {
    console.error('Subtitle load error:', error);
    showAlert("Subtitle Error", `Failed to load: ${error.message}`);
};

export const handlePlaybackError = (error: any, message: string = "Unable to load the video") => {
    console.error('Playback error:', error);
    showAlert("Playback Error", message);
};

// ==================== COMPONENTS ====================

// Waiting Lobby Component
export const WaitingLobby: React.FC<{
    hasStartedPlaying: boolean;
    opacity: Animated.Value;
    error?: boolean;
}> = ({ hasStartedPlaying, opacity, error }) => {
    if (hasStartedPlaying || error) return null;

    return (
        <Animated.View
            style={[styles.bufferingContainer, { opacity }]}
            pointerEvents="none"
        >
            <ActivityIndicator size="large" color="#535aff" />
            <Text style={styles.bufferingText}>
                {"Loading..."}
            </Text>
        </Animated.View>
    );
};

// Artwork Background Component
export const ArtworkBackground: React.FC<{
    artwork?: string;
    isBuffering: boolean;
    hasStartedPlaying?: boolean;
    error?: boolean;
}> = ({ artwork, isBuffering, hasStartedPlaying = true, error }) => {
    if (!artwork || hasStartedPlaying || error) return null;

    return (
        <View style={styles.artworkContainer}>
            <Image
                source={{ uri: artwork }}
                style={styles.artworkImage}
                resizeMode="cover"
            />
            <View style={styles.artworkOverlay} />
            {isBuffering && (
                <View style={styles.artworkLoadingOverlay}>
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.bufferingText}>Loading...</Text>
                </View>
            )}
        </View>
    );
};

// Subtitle Display Component with positioning support
export const SubtitleDisplay: React.FC<{
    subtitle: string;
    position?: SubtitlePosition;
    error?: boolean;
}> = ({ subtitle, position = 0, error }) => {
    if (!subtitle || error) return null;

    const getPositionStyle = (): any => {
        const baseBottom = 25;
        const offsetPerLevel = 5;
        const calculatedBottom = baseBottom + (position * offsetPerLevel);

        return {
            top: undefined,
            bottom: calculatedBottom,
        };
    };

    return (
        <View style={[styles.subtitleContainer, getPositionStyle()]} pointerEvents="none">
            <View style={styles.subtitleBackground}>
                <BlurView intensity={60} tint="light" style={styles.blurView}>
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.6)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientOverlay}
                    >
                        <Text style={styles.subtitleText}>{subtitle}</Text>
                    </LinearGradient>
                </BlurView>
            </View>
        </View>
    );
};

// Center Playback Controls Component
export const CenterControls: React.FC<{
    isPlaying: boolean;
    isReady: boolean;
    isBuffering: boolean;
    onPlayPause: () => void;
    onSkipBackward: () => void;
    onSkipForward: () => void;
}> = ({ isPlaying, isReady, isBuffering, onPlayPause, onSkipBackward, onSkipForward }) => {
    // Don't render anything if not ready at all
    if (!isReady) {
        return null;
    }

    return (
        <View style={styles.centerControls}>
            <TouchableOpacity
                style={[styles.skipButton]}
                onPress={onSkipBackward}
            >
                <GlassView glassEffectStyle="clear" style={styles.glassIcon}>
                    <MaterialIcons
                        name="replay-10"
                        size={36}
                        color={"#ffffff"}
                    />
                </GlassView>
            </TouchableOpacity>

            {isBuffering ? (
                <GlassView glassEffectStyle="clear" style={styles.glassIcon}>
                    <View style={styles.bufferingButton}>
                        <ActivityIndicator style={{ paddingHorizontal: 12 }} size="large" color="#ffffff" />
                    </View>
                </GlassView>
            ) : (
                <GlassView glassEffectStyle="clear" style={styles.glassIcon}>
                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={onPlayPause}
                    >
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={60}
                            color="#ffffff"
                        />
                    </TouchableOpacity>
                </GlassView>
            )}

            <TouchableOpacity
                style={[styles.skipButton]}
                onPress={onSkipForward}
            >
                <GlassView glassEffectStyle="clear" style={styles.glassIcon}>
                    <MaterialIcons
                        name="forward-30"
                        size={36}
                        color={"#ffffff"}
                    />
                </GlassView>
            </TouchableOpacity>
        </View >
    );
};

// Progress Bar Component
export const ProgressBar: React.FC<{
    currentTime: number;
    duration: number;
    sliderValue: number;
    isReady: boolean;
    onValueChange: (value: number) => void;
    onSlidingStart: () => void;
    onSlidingComplete: (value: number) => void;
    showSpeed?: boolean;
    playbackSpeed?: number;
}> = ({
    currentTime,
    duration,
    sliderValue,
    isReady,
    onValueChange,
    onSlidingStart,
    onSlidingComplete,
    showSpeed = false,
    playbackSpeed = 1.0
}) => {
        return (
            <View style={styles.bottomControls}>
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>

                <View style={styles.progressContainerWithMargin}>
                    <GlassView glassEffectStyle="clear" style={styles.glassIcon}>
                        <Slider
                            style={styles.progressSlider}
                            minimumValue={0}
                            maximumValue={1}
                            value={sliderValue}
                            onValueChange={onValueChange}
                            onSlidingStart={onSlidingStart}
                            onSlidingComplete={onSlidingComplete}
                            minimumTrackTintColor="rgba(83, 90, 255, 0.9)"
                            maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                            thumbTintColor="#fff"
                            thumbSize={20}
                            trackHeight={5}
                            enabled={isReady}
                        />
                    </GlassView>
                </View>
            </View>
        );
    };

// Seek Feedback Component
export const SeekFeedback: React.FC<{
    show: boolean;
    direction: 'forward' | 'backward';
    seconds: number;
}> = React.memo(({ show, direction, seconds }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        if (show) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(fadeAnim, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scaleAnim, {
                            toValue: 0.8,
                            duration: 300,
                            useNativeDriver: true,
                        })
                    ]).start();
                }, 800);
            });
        }
    }, [show, fadeAnim, scaleAnim]);

    if (!show) return null;

    return (
        <Animated.View
            style={[
                styles.seekFeedback,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                    left: direction === 'backward' ? '20%' : undefined,
                    right: direction === 'forward' ? '20%' : undefined,
                }
            ]}
            pointerEvents="none"
        >
            <View style={styles.seekFeedbackContent}>
                <Ionicons
                    name={direction === 'forward' ? 'play-forward' : 'play-back'}
                    size={32}
                    color="white"
                />
                <Text style={styles.seekFeedbackText}>{seconds}s</Text>
            </View>
        </Animated.View>
    );
});

// Content Fit Label Component
export const ContentFitLabel: React.FC<{
    show: boolean;
    contentFit: string;
    opacity: Animated.Value;
}> = ({ show, contentFit, opacity }) => {
    if (!show) return null;

    return (
        <Animated.View
            style={[styles.contentFitLabelContainer, { opacity }]}
            pointerEvents="none"
        >
            <Text style={styles.contentFitLabelText}>{contentFit.toUpperCase()}</Text>
        </Animated.View>
    );
};

// Error Display Component
export const ErrorDisplay: React.FC<{
    error: string | null;
    onBack: () => void;
    onRetry?: () => void;
}> = ({ error, onBack, onRetry }) => {
    if (!error) return null;

    return (
        <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#ff6b6b" />
            <Text style={styles.errorTitle}>Playback Error</Text>
            <Text style={styles.errorText}>{error}</Text>
        </View>
    );
};