import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Platform,
    Image,
    Alert,
} from "react-native";
import { PlayerResizeMode, VLCPlayer } from 'react-native-vlc-media-player';
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from '@react-native-assets/slider';
import * as Haptics from 'expo-haptics';
import ImmersiveMode from "react-native-immersive-mode";

export interface Subtitle {
    fileId: string | number | null;
    language: string;
    url: string;
    label: string;
}

export interface AudioTrack {
    language: string;
    label: string;
    id: string;
}

export interface Chapter {
    title: string;
    start: number;
    thumbnail?: string;
}

interface OpenSubtitlesClient {
    downloadSubtitle(fileId: string): Promise<DownloadResponse | ErrorResponse>;
}

interface DownloadResponse {
    link: string;
    file_name: string;
    requests: number;
    remaining: number;
    message: string;
}

interface ErrorResponse {
    message: string;
    status: number;
}

interface MediaPlayerProps {
    videoUrl: string;
    title: string;
    onBack: () => void;
    artwork?: string;
    subtitles?: Subtitle[];
    openSubtitlesClient: OpenSubtitlesClient;
}

// Custom hooks for better state management
const usePlayerState = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showBufferingLoader, setShowBufferingLoader] = useState(false);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

    return {
        isPlaying, setIsPlaying,
        currentTime, setCurrentTime,
        duration, setDuration,
        isBuffering, setIsBuffering,
        isPaused, setIsPaused,
        isReady, setIsReady,
        isDragging, setIsDragging,
        dragPosition, setDragPosition,
        error, setError,
        showBufferingLoader, setShowBufferingLoader,
        hasStartedPlaying, setHasStartedPlaying
    };
};

const useSubtitleState = () => {
    const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
    const [parsedSubtitles, setParsedSubtitles] = useState<any[]>([]);
    const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);

    return {
        currentSubtitle, setCurrentSubtitle,
        parsedSubtitles, setParsedSubtitles,
        isLoadingSubtitles, setIsLoadingSubtitles
    };
};

const useUIState = () => {
    const [showControls, setShowControls] = useState(true);
    const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
    const [showAudioSettings, setShowAudioSettings] = useState(false);
    const [showSpeedSettings, setShowSpeedSettings] = useState(false);

    const hideAllPanels = () => {
        setShowSubtitleSettings(false);
        setShowAudioSettings(false);
        setShowSpeedSettings(false);
    };

    return {
        showControls, setShowControls,
        showSubtitleSettings, setShowSubtitleSettings,
        showAudioSettings, setShowAudioSettings,
        showSpeedSettings, setShowSpeedSettings,
        hideAllPanels
    };
};

const usePlayerSettings = () => {
    const [isMuted, setIsMuted] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [resizeMode, setResizeMode] = useState<PlayerResizeMode>('fill');
    const [brightness, setBrightness] = useState<number>(1);
    const [selectedSubtitle, setSelectedSubtitle] = useState<number>(-1);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(1);
    const [availableAudioTracks, setAvailableAudioTracks] = useState<any[]>([]);

    return {
        isMuted, setIsMuted,
        playbackSpeed, setPlaybackSpeed,
        resizeMode, setResizeMode,
        brightness, setBrightness,
        selectedSubtitle, setSelectedSubtitle,
        selectedAudioTrack, setSelectedAudioTrack,
        availableAudioTracks, setAvailableAudioTracks
    };
};

const useTimers = () => {
    const hideControlsTimer = useRef<any>(null);
    const resizeModeLabelTimer = useRef<any>(null);
    const bufferingTimer = useRef<any>(null);
    const controlsDebounceTimer = useRef<any>(null);
    const progressDebounceTimer = useRef<any>(null);

    const clearAllTimers = () => {
        [hideControlsTimer.current, resizeModeLabelTimer.current, bufferingTimer.current,
        controlsDebounceTimer.current, progressDebounceTimer.current]
            .forEach(timer => timer && clearTimeout(timer));
    };

    return {
        hideControlsTimer,
        resizeModeLabelTimer,
        bufferingTimer,
        controlsDebounceTimer,
        progressDebounceTimer,
        clearAllTimers
    };
};

// SRT Parser Function
const parseSRT = (srtContent: string) => {
    const subtitles = [];
    const blocks = srtContent.trim().split('\n\n');

    for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const index = lines[0].trim();
            const timeString = lines[1].trim();
            const text = lines.slice(2).join('\n').trim();

            // Parse SRT time format: 00:00:20,000 --> 00:00:24,400
            const timeMatch = timeString.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);

            if (timeMatch) {
                const startTime = parseSRTTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
                const endTime = parseSRTTime(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);

                subtitles.push({
                    index: parseInt(index),
                    start: startTime,
                    end: endTime,
                    text: cleanSubtitleText(text)
                });
            }
        }
    }

    return subtitles;
};

// Helper function to parse SRT time format
const parseSRTTime = (hours: string, minutes: string, seconds: string, milliseconds: string): number => {
    return parseInt(hours) * 3600 +
        parseInt(minutes) * 60 +
        parseInt(seconds) +
        parseInt(milliseconds) / 1000;
};

// Clean subtitle text by removing HTML tags and formatting codes
const cleanSubtitleText = (text: string): string => {
    return text
        // Remove HTML tags like <i>, </i>, <b>, </b>, etc.
        .replace(/<[^>]*>/g, '')
        // Remove SRT/ASS formatting codes like {\an8}, {\pos(x,y)}, etc.
        .replace(/\{[^}]*\}/g, '')
        // Remove common subtitle formatting
        .replace(/\\N/g, '\n') // Convert \N to actual line breaks
        .replace(/\\h/g, ' ')  // Convert \h to spaces
        // Clean up multiple spaces and line breaks
        .replace(/\s+/g, ' ')
        .replace(/\n\s+/g, '\n')
        .trim();
};

// WebVTT Parser (keeping for compatibility)
const parseWebVTT = (vttContent: string) => {
    const lines = vttContent.split('\n');
    const subtitles = [];
    let currentSubtitle = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.includes('-->')) {
            const [start, end] = line.split('-->').map(t => t.trim());
            currentSubtitle = {
                start: parseVTTTime(start),
                end: parseVTTTime(end),
                text: ''
            };
        } else if (line && currentSubtitle && !line.startsWith('NOTE') && !line.startsWith('WEBVTT')) {
            if (currentSubtitle.text) {
                currentSubtitle.text += '\n' + line;
            } else {
                currentSubtitle.text = line;
            }
        } else if (!line && currentSubtitle) {
            currentSubtitle.text = cleanSubtitleText(currentSubtitle.text);
            subtitles.push(currentSubtitle);
            currentSubtitle = null;
        }
    }

    if (currentSubtitle) {
        currentSubtitle.text = cleanSubtitleText(currentSubtitle.text);
        subtitles.push(currentSubtitle);
    }

    return subtitles;
};

const parseVTTTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
    } else if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return parseInt(minutes) * 60 + parseFloat(seconds);
    }
    return 0;
};

// Auto-detect subtitle format and parse accordingly
const parseSubtitleFile = (content: string) => {
    const trimmedContent = content.trim();

    // Check if it's WebVTT format
    if (trimmedContent.startsWith('WEBVTT')) {
        console.log('Detected WebVTT format');
        return parseWebVTT(content);
    }

    // Check if it's SRT format (contains --> with comma for milliseconds)
    if (trimmedContent.includes('-->') && trimmedContent.includes(',')) {
        console.log('Detected SRT format');
        return parseSRT(content);
    }

    // Default to SRT parsing
    console.log('Defaulting to SRT format');
    return parseSRT(content);
};


const NativeMediaPlayerComponent: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    onBack,
    artwork,
    subtitles = [],
    openSubtitlesClient
}) => {
    const playerRef = useRef<VLCPlayer>(null);
    const playerState = usePlayerState();
    const uiState = useUIState();
    const subtitleState = useSubtitleState();
    const settings = usePlayerSettings();
    const timers = useTimers();

    // Animated values
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const progressBarValue = useRef(new Animated.Value(0)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;
    const resizeModeLabelOpacity = useRef(new Animated.Value(0)).current;

    // Setup and cleanup
    useEffect(() => {
        const setupOrientation = async () => {
            try {
                if (Platform.OS !== 'web') {
                    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                    StatusBar.setHidden(true);
                }
            } catch (error) {
                console.warn("Failed to set orientation:", error);
            }
        };

        setupOrientation();

        return () => {
            if (Platform.OS !== 'web') {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                StatusBar.setHidden(false);
            }
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

    // Updated subtitle loading effect using OpenSubtitles client
    useEffect(() => {
        if (subtitles.length > 0 && settings.selectedSubtitle >= 0 && settings.selectedSubtitle < subtitles.length) {
            const selectedSub = subtitles[settings.selectedSubtitle];

            // Check if we have a fileId to download from OpenSubtitles
            if (selectedSub.fileId && openSubtitlesClient) {
                subtitleState.setIsLoadingSubtitles(true);
                console.log('Downloading subtitle from OpenSubtitles, fileId:', selectedSub.fileId);

                openSubtitlesClient.downloadSubtitle(String(selectedSub.fileId))
                    .then(async (response) => {
                        if ('status' in response && response.status !== 200) {
                            console.error('OpenSubtitles API error:', response.message);
                            subtitleState.setIsLoadingSubtitles(false);
                            subtitleState.setParsedSubtitles([]);
                            Alert.alert("Subtitle Error", `Failed to download subtitle: ${response.message}`);
                            return;
                        }

                        const downloadResponse = response as DownloadResponse;
                        console.log('Subtitle download response:', downloadResponse);

                        if (!downloadResponse.link) {
                            throw new Error('No download link provided');
                        }

                        // Fetch the actual subtitle file from the download link
                        const subtitleResponse = await fetch(downloadResponse.link);
                        if (!subtitleResponse.ok) {
                            throw new Error(`HTTP error! status: ${subtitleResponse.status}`);
                        }

                        const subtitleContent = await subtitleResponse.text();
                        console.log('Subtitle content loaded, length:', subtitleContent.length);
                        console.log('First 200 chars:', subtitleContent.substring(0, 200));

                        const parsed = parseSubtitleFile(subtitleContent);
                        console.log('Parsed subtitles count:', parsed.length);

                        if (parsed.length > 0) {
                            console.log('First subtitle:', parsed[0]);
                        }

                        subtitleState.setParsedSubtitles(parsed);
                        subtitleState.setIsLoadingSubtitles(false);
                    })
                    .catch(error => {
                        console.error('Failed to download/parse subtitle:', error);
                        subtitleState.setIsLoadingSubtitles(false);
                        subtitleState.setParsedSubtitles([]);
                        Alert.alert("Subtitle Error", `Failed to load subtitle: ${error.message}`);
                    });
            }
            // Fallback to direct URL if no fileId or openSubtitlesClient
            else if (selectedSub.url && selectedSub.url !== '' && !selectedSub.url.includes('opensubtitles.org')) {
                subtitleState.setIsLoadingSubtitles(true);
                console.log('Loading subtitle from direct URL:', selectedSub.url);

                fetch(selectedSub.url)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.text();
                    })
                    .then(subtitleContent => {
                        console.log('Subtitle content loaded, length:', subtitleContent.length);
                        console.log('First 200 chars:', subtitleContent.substring(0, 200));

                        const parsed = parseSubtitleFile(subtitleContent);
                        console.log('Parsed subtitles count:', parsed.length);

                        if (parsed.length > 0) {
                            console.log('First subtitle:', parsed[0]);
                        }

                        subtitleState.setParsedSubtitles(parsed);
                        subtitleState.setIsLoadingSubtitles(false);
                    })
                    .catch(error => {
                        console.error('Failed to load subtitles from URL:', error);
                        subtitleState.setIsLoadingSubtitles(false);
                        subtitleState.setParsedSubtitles([]);
                        Alert.alert("Subtitle Error", `Failed to load subtitle: ${error.message}`);
                    });
            } else {
                console.warn('No valid fileId or direct URL for subtitle:', selectedSub);
                subtitleState.setParsedSubtitles([]);
                subtitleState.setCurrentSubtitle('');
            }
        } else {
            subtitleState.setParsedSubtitles([]);
            subtitleState.setCurrentSubtitle('');
        }
    }, [settings.selectedSubtitle, subtitles, openSubtitlesClient]);

    // Updated subtitle display effect
    useEffect(() => {
        if (subtitleState.parsedSubtitles.length > 0) {
            const currentTime = playerState.currentTime;
            const activeSubtitle = subtitleState.parsedSubtitles.find(
                sub => currentTime >= sub.start && currentTime <= sub.end
            );

            const newSubtitleText = activeSubtitle ? activeSubtitle.text : '';

            // Only update if the subtitle text has changed
            if (newSubtitleText !== subtitleState.currentSubtitle) {
                console.log(`Time: ${currentTime.toFixed(1)}s - Subtitle: "${newSubtitleText}"`);
                subtitleState.setCurrentSubtitle(newSubtitleText);
            }
        } else if (subtitleState.currentSubtitle !== '') {
            subtitleState.setCurrentSubtitle('');
        }
    }, [playerState.currentTime, subtitleState.parsedSubtitles]);

    // Utility functions
    const playHaptic = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
            console.log('Haptics not supported');
        }
    };

    const formatTime = useCallback((seconds: number) => {
        if (isNaN(seconds) || seconds < 0) return "0:00";
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const showControlsTemporarily = useCallback(() => {
        uiState.setShowControls(true);
        controlsOpacity.setValue(1);

        if (timers.hideControlsTimer.current) {
            clearTimeout(timers.hideControlsTimer.current);
        }

        timers.hideControlsTimer.current = setTimeout(() => {
            if (playerState.isPlaying && !uiState.showSubtitleSettings && !uiState.showAudioSettings &&
                !uiState.showSpeedSettings) {
                Animated.timing(controlsOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => {
                    uiState.setShowControls(false);
                });
            }
        }, 2000);
    }, [playerState.isPlaying, controlsOpacity, uiState, timers]);

    // VLC Event Handlers
    const vlcHandlers = useMemo(() => ({
        onLoad: (data: any) => {
            console.log('VLC Player loaded:', data);
            playerState.setIsBuffering(false);
            playerState.setIsReady(false);
            playerState.setError(null);
            playerState.setHasStartedPlaying(true);
            playerState.setIsPlaying(true);
            playerState.setShowBufferingLoader(false);

            uiState.setShowControls(true);
            controlsOpacity.setValue(1);

            if (timers.hideControlsTimer.current) {
                clearTimeout(timers.hideControlsTimer.current);
            }
            timers.hideControlsTimer.current = setTimeout(() => {
                if (playerState.isPlaying) {
                    Animated.timing(controlsOpacity, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }).start(() => {
                        uiState.setShowControls(false);
                    });
                }
            }, 2000);

            if (data?.audioTracks) {
                settings.setAvailableAudioTracks(data.audioTracks);
            }
            if (data?.duration) {
                playerState.setDuration(data.duration / 1000);
            }

            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        },

        onProgress: (data: any) => {
            if (playerState.isDragging) return;

            if (timers.progressDebounceTimer.current) {
                clearTimeout(timers.progressDebounceTimer.current);
            }

            timers.progressDebounceTimer.current = setTimeout(() => {
                const { currentTime: current, duration: dur } = data;
                playerState.setCurrentTime(current / 1000);

                if (playerState.duration === 0 && dur > 0) {
                    playerState.setDuration(dur / 1000);
                }

                if (playerState.duration > 0) {
                    const progress = (current / 1000) / playerState.duration;
                    progressBarValue.setValue(progress);
                }
            }, 100);
        },

        onBuffering: (data: any) => {
            const { isBuffering: buffering } = data;
            playerState.setIsBuffering(buffering);

            if (timers.bufferingTimer.current) {
                clearTimeout(timers.bufferingTimer.current);
            }

            if (buffering) {
                // Show buffering immediately for better UX
                playerState.setShowBufferingLoader(true);
                Animated.timing(bufferOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }).start();
            } else {
                playerState.setShowBufferingLoader(false);
                Animated.timing(bufferOpacity, {
                    toValue: 0,
                    duration: 200,
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

            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        },

        onPaused: () => {
            console.log('On Paused');
            playerState.setIsPlaying(false);
            playerState.setIsPaused(true);
        },

        onStopped: () => {
            console.log('On Stopped');
            playerState.setIsPlaying(false);
            playerState.setIsPaused(false);
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
            Alert.alert("Video Error", errorMessage);
        }
    }), [playerState, settings, bufferOpacity, timers, progressBarValue]);

    // Control actions
    const controlActions = useMemo(() => ({
        togglePlayPause: async () => {
            console.log('On Toggle');
            if (!playerState.isReady || !playerRef.current) return;

            await playHaptic();
            if (playerState.isPlaying) {
                console.log('Pause');
                playerState.setIsPaused(true);
            } else {
                console.log('Resume');
                playerState.setIsPaused(false);
            }
            showControlsTemporarily();
        },

        seekTo: (absoluteSeconds: number) => {
            if (!playerState.isReady || playerState.duration <= 0 || !playerRef.current) return;

            const clampedTime = Math.max(0, Math.min(playerState.duration, absoluteSeconds));
            const position = clampedTime / playerState.duration;

            playerRef.current.seek(position);
            playerState.setCurrentTime(clampedTime);
            showControlsTemporarily();
        },

        skipTime: async (offsetSeconds: number) => {
            if (!playerState.isReady || playerState.duration <= 0) return;

            await playHaptic();
            const newTime = playerState.currentTime + offsetSeconds;
            controlActions.seekTo(newTime);
        },

        toggleMute: async () => {
            console.log('On Toggle Mute');
            await playHaptic();
            settings.setIsMuted(!settings.isMuted);
            showControlsTemporarily();
        },

    }), [playerState, settings, showControlsTemporarily, timers, resizeModeLabelOpacity, uiState]);

    // Slider handlers
    const sliderHandlers = useMemo(() => ({
        handleSliderValueChange: (value: number) => {
            if (!playerState.isReady || playerState.duration <= 0) return;

            playerState.setIsDragging(true);
            playerState.setDragPosition(value);
            progressBarValue.setValue(value);

            const newTime = value * playerState.duration;
            playerState.setCurrentTime(newTime);
        },

        handleSliderSlidingStart: () => {
            playerState.setIsDragging(true);
            showControlsTemporarily();
        },

        handleSliderSlidingComplete: (value: number) => {
            if (!playerState.isReady || playerState.duration <= 0) {
                playerState.setIsDragging(false);
                return;
            }

            playerState.setIsDragging(false);
            const newTime = value * playerState.duration;
            controlActions.seekTo(newTime);
        }
    }), [playerState, showControlsTemporarily, controlActions, progressBarValue]);

    // Panel toggles
    const panelToggles = useMemo(() => ({
        toggleVolumeSlider: async () => {
            console.log('On Toggle Volume Slider');
            await playHaptic();
            uiState.setShowSubtitleSettings(false);
            uiState.setShowAudioSettings(false);
            uiState.setShowSpeedSettings(false);
            showControlsTemporarily();
        },

        toggleBrightnessSlider: async () => {
            await playHaptic();
            uiState.setShowSubtitleSettings(false);
            uiState.setShowAudioSettings(false);
            uiState.setShowSpeedSettings(false);
            showControlsTemporarily();
        },

        toggleSubtitleSettings: async () => {
            await playHaptic();
            uiState.setShowSubtitleSettings(!uiState.showSubtitleSettings);
            uiState.setShowAudioSettings(false);
            uiState.setShowSpeedSettings(false);
            showControlsTemporarily();
        },

        toggleAudioSettings: async () => {
            await playHaptic();
            uiState.setShowAudioSettings(!uiState.showAudioSettings);
            uiState.setShowSubtitleSettings(false);
            uiState.setShowSpeedSettings(false);
            showControlsTemporarily();
        },

        toggleSpeedSettings: async () => {
            await playHaptic();
            uiState.setShowSpeedSettings(!uiState.showSpeedSettings);
            uiState.setShowSubtitleSettings(false);
            uiState.setShowAudioSettings(false);
            showControlsTemporarily();
        }
    }), [uiState, showControlsTemporarily]);

    // Selection handlers
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
        if (uiState.showSubtitleSettings || uiState.showAudioSettings || uiState.showSpeedSettings) {
            uiState.hideAllPanels();
        } else {
            if (uiState.showControls) {
                Animated.timing(controlsOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    uiState.setShowControls(false);
                });
            } else {
                showControlsTemporarily();
            }
        }
    }, [uiState, controlsOpacity, showControlsTemporarily]);

    const displayTime = playerState.isDragging ? playerState.dragPosition * playerState.duration : playerState.currentTime;
    const sliderValue = playerState.isDragging ? playerState.dragPosition : (playerState.duration > 0 ? playerState.currentTime / playerState.duration : 0);

    return (
        <View style={styles.container}>
            {!playerState.error && (
                <VLCPlayer
                    ref={playerRef}
                    style={styles.video}
                    source={{
                        uri: videoUrl,
                        initType: 2,
                        initOptions: [
                            "--network-caching=1000"
                        ],
                    }}
                    autoplay={true}
                    autoAspectRatio={false}
                    resizeMode={'cover'}
                    playInBackground={true}
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
                    onError={vlcHandlers.onError}
                />
            )}

            {playerState.error && (
                <View style={styles.errorContainer}>
                    <TouchableOpacity
                        style={styles.errorBackButton}
                        onPress={async () => {
                            await playHaptic();
                            onBack();
                        }}
                    >
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>

                    <MaterialIcons name="error-outline" size={64} color="#ff6b6b" />
                    <Text style={styles.errorTitle}>Playback Error</Text>
                    <Text style={styles.errorText}>{playerState.error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => {
                        playerState.setError(null);
                        playerState.setIsReady(false);
                        playerState.setIsBuffering(true);
                        playerState.setHasStartedPlaying(false);
                    }}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Show artwork during loading */}
            {artwork && !playerState.hasStartedPlaying && !playerState.error && (
                <View style={styles.artworkContainer}>
                    <Image
                        source={{ uri: artwork }}
                        style={styles.artworkImage}
                        resizeMode="cover"
                    />
                    <View style={styles.artworkOverlay} />
                    <View style={styles.artworkLoadingOverlay}>
                        <ActivityIndicator size="large" color="#535aff" />
                        <Text style={styles.bufferingText}>Loading...</Text>
                    </View>
                </View>
            )}

            {/* Loading indicator - show during any buffering */}
            {(playerState.showBufferingLoader || playerState.isBuffering) && !playerState.error && (
                <Animated.View
                    style={[
                        styles.bufferingContainer,
                        { opacity: bufferOpacity }
                    ]}
                    pointerEvents="none"
                >
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.bufferingText}>
                        {playerState.hasStartedPlaying ? "Buffering..." : "Loading..."}
                    </Text>
                </Animated.View>
            )}

            {/* Touch area for showing controls */}
            {!playerState.error && (
                <TouchableOpacity
                    style={styles.touchArea}
                    activeOpacity={1}
                    onPress={handleOverlayPress}
                />
            )}

            {/* Subtitle display - Updated styling for better visibility */}
            {subtitleState.currentSubtitle && !playerState.error && (
                <View style={styles.subtitleContainer} pointerEvents="none">
                    <Text style={styles.subtitleText}>{subtitleState.currentSubtitle}</Text>
                </View>
            )}

            {/* Controls overlay */}
            {uiState.showControls && !playerState.error && (
                <Animated.View
                    style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
                    pointerEvents="box-none"
                >
                    {/* Top controls */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.8)', 'transparent']}
                        style={styles.topControls}
                    >
                        <TouchableOpacity style={styles.backButton} onPress={async () => {
                            await playHaptic();
                            onBack();
                        }}>
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
                                onPress={controlActions.toggleMute}
                            >
                                <Ionicons
                                    name={settings.isMuted ? "volume-mute" : "volume-high"}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {subtitles.length > 0 && (
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={panelToggles.toggleSubtitleSettings}
                                >
                                    <MaterialIcons
                                        name="closed-caption"
                                        size={24}
                                        color={"white"}
                                    />
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={panelToggles.toggleAudioSettings}
                            >
                                <MaterialIcons
                                    name="audiotrack"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={panelToggles.toggleSpeedSettings}
                            >
                                <MaterialIcons
                                    name="speed"
                                    size={24}
                                    color={settings.playbackSpeed !== 1.0 ? "#007AFF" : "white"}
                                />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* Center controls - Hidden during buffering */}
                    {!playerState.isBuffering && !uiState.showSubtitleSettings && !uiState.showAudioSettings && !uiState.showSpeedSettings && (
                        <View style={styles.centerControls}>
                            <TouchableOpacity
                                style={[styles.skipButton, !playerState.isReady && styles.disabledButton]}
                                onPress={() => controlActions.skipTime(-10)}
                                disabled={!playerState.isReady}
                            >
                                <MaterialIcons
                                    name="replay-10"
                                    size={36}
                                    color={playerState.isReady ? "white" : "rgba(255,255,255,0.5)"}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.playButton, !playerState.isReady && styles.disabledButton]}
                                onPress={controlActions.togglePlayPause}
                                disabled={!playerState.isReady}
                            >
                                <Ionicons
                                    name={playerState.isPlaying ? "pause" : "play"}
                                    size={60}
                                    color={playerState.isReady ? "white" : "rgba(255,255,255,0.5)"}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.skipButton, !playerState.isReady && styles.disabledButton]}
                                onPress={() => controlActions.skipTime(30)}
                                disabled={!playerState.isReady}
                            >
                                <MaterialIcons
                                    name="forward-30"
                                    size={36}
                                    color={playerState.isReady ? "white" : "rgba(255,255,255,0.5)"}
                                />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Bottom controls */}
                    {!uiState.showSubtitleSettings && !uiState.showAudioSettings && !uiState.showSpeedSettings && (
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            style={styles.bottomControls}
                        >
                            <View style={styles.timeContainer}>
                                <Text style={styles.timeText}>
                                    {formatTime(displayTime)}
                                </Text>
                                <Text style={styles.timeText}>
                                    {formatTime(playerState.duration)}
                                </Text>
                            </View>

                            <View style={styles.progressContainerWithMargin}>
                                <Slider
                                    style={styles.progressSlider}
                                    minimumValue={0}
                                    maximumValue={1}
                                    value={sliderValue}
                                    onValueChange={sliderHandlers.handleSliderValueChange}
                                    onSlidingStart={sliderHandlers.handleSliderSlidingStart}
                                    onSlidingComplete={sliderHandlers.handleSliderSlidingComplete}
                                    minimumTrackTintColor="#007AFF"
                                    maximumTrackTintColor="rgba(255,255,255,0.4)"
                                    thumbTintColor={'#fff'}
                                    thumbSize={20}
                                    trackHeight={5}
                                    enabled={playerState.isReady || playerState.duration >= 0}
                                />
                            </View>
                        </LinearGradient>
                    )}
                </Animated.View>
            )}

            {/* Subtitle settings with glassmorphism */}
            {uiState.showSubtitleSettings && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => uiState.setShowSubtitleSettings(false)}
                >
                    <TouchableOpacity
                        style={styles.glassPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.panelTitle}>Subtitles</Text>
                        {subtitleState.isLoadingSubtitles && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#007AFF" />
                                <Text style={styles.loadingText}>Downloading subtitles...</Text>
                            </View>
                        )}
                        <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[
                                    styles.settingOption,
                                    settings.selectedSubtitle === -1 && styles.settingOptionSelected
                                ]}
                                onPress={() => selectSubtitle(-1)}
                            >
                                <Text style={styles.settingOptionText}>Off</Text>
                                {settings.selectedSubtitle === -1 && (
                                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                                )}
                            </TouchableOpacity>
                            {subtitles.map((sub, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.settingOption,
                                        settings.selectedSubtitle === index && styles.settingOptionSelected
                                    ]}
                                    onPress={() => selectSubtitle(index)}
                                >
                                    <View style={styles.subtitleOptionContent}>
                                        <Text style={styles.settingOptionText} numberOfLines={5}>
                                            {sub.label}
                                        </Text>
                                        {sub.fileId && (
                                            <Text style={styles.subtitleSourceText}>OpenSubtitles</Text>
                                        )}
                                        {!sub.fileId && sub.url && !sub.url.includes('opensubtitles.org') && (
                                            <Text style={styles.subtitleSourceText}>Direct URL</Text>
                                        )}
                                    </View>
                                    {settings.selectedSubtitle === index && (
                                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Audio settings with glassmorphism */}
            {uiState.showAudioSettings && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => uiState.setShowAudioSettings(false)}
                >
                    <TouchableOpacity
                        style={styles.glassPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.panelTitle}>Audio Track</Text>
                        <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
                            {settings.availableAudioTracks.length === 0 ? (
                                <Text style={styles.noTracksText}>No audio tracks available</Text>
                            ) : (
                                settings.availableAudioTracks.map((track) => (
                                    <TouchableOpacity
                                        key={track.id}
                                        style={[
                                            styles.settingOption,
                                            settings.selectedAudioTrack === track.id && styles.settingOptionSelected
                                        ]}
                                        onPress={() => selectAudioTrack(track.id)}
                                    >
                                        <Text style={styles.settingOptionText}>
                                            {track.name}
                                        </Text>
                                        {settings.selectedAudioTrack === track.id && (
                                            <Ionicons name="checkmark" size={20} color="#007AFF" />
                                        )}
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Speed settings with glassmorphism */}
            {uiState.showSpeedSettings && (
                <TouchableOpacity
                    style={styles.glassOverlay}
                    activeOpacity={1}
                    onPress={() => uiState.setShowSpeedSettings(false)}
                >
                    <TouchableOpacity
                        style={styles.glassPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.panelTitle}>Playback Speed</Text>
                        <View style={styles.speedOptionsGrid}>
                            {[0.75, 0.8, 0.9, 1.0, 1.1, 1.2, 1.25].map(speed => (
                                <TouchableOpacity
                                    key={speed}
                                    style={[
                                        styles.speedOption,
                                        settings.playbackSpeed === speed && styles.speedOptionSelected
                                    ]}
                                    onPress={() => changePlaybackSpeed(speed)}
                                >
                                    <Text style={[
                                        styles.speedOptionText,
                                        settings.playbackSpeed === speed && styles.speedOptionTextSelected
                                    ]}>
                                        {speed}x
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    touchArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        padding: 40,
    },
    errorTitle: {
        color: '#ff6b6b',
        fontSize: 24,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 12,
        textAlign: 'center',
    },
    errorText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    controlsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
    },
    topControls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
        marginRight: 16,
    },
    titleContainer: {
        flex: 1,
        marginRight: 16,
    },
    titleText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    topRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlButton: {
        padding: 8,
        marginLeft: 12,
    },
    centerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 60,
    },
    skipButton: {
        padding: 20,
        marginHorizontal: 20,
    },
    playButton: {
        padding: 16,
        marginHorizontal: 30,
    },
    disabledButton: {
        opacity: 0.5,
    },
    bottomControls: {
        paddingHorizontal: 40,
        paddingBottom: 40,
        paddingTop: 20,
        height: 120,
        marginHorizontal: 20
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressContainerWithMargin: {
        marginBottom: 16,
        paddingVertical: 10
    },
    progressSlider: {
        width: '100%',
        height: 40
    },
    timeText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    bufferingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 10,
    },
    bufferingText: {
        color: 'white',
        fontSize: 16,
        marginTop: 8,
    },
    artworkContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    artworkImage: {
        width: '100%',
        height: '100%',
    },
    artworkOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    artworkLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    glassOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    glassPanel: {
        backgroundColor: '#1a1a1af2',
        borderRadius: 12,
        padding: 24,
        minWidth: 500,
        maxWidth: '90%',
        maxHeight: '75%',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    panelTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    settingsContent: {
        maxHeight: 300,
    },
    settingOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(142, 142, 142, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    settingOptionSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.2)',
        borderColor: 'rgba(0, 122, 255, 0.4)',
    },
    settingOptionText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    speedOptionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    speedOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 60,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    speedOptionSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.3)',
        borderColor: 'rgba(0, 122, 255, 0.5)',
    },
    speedOptionText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    speedOptionTextSelected: {
        fontWeight: '700',
        color: '#007AFF',
    },
    errorBackButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        padding: 8,
        zIndex: 1,
    },
    subtitleContainer: {
        position: 'absolute',
        bottom: 25,
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 5,
    },
    subtitleText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '400',
        textAlign: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        lineHeight: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 8,
        maxWidth: '90%',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        paddingVertical: 8,
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        marginLeft: 8,
    },
    noTracksText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 16,
        textAlign: 'center',
        paddingVertical: 20,
    },
    subtitleOptionContent: {
        flex: 1,
    },
    subtitleSourceText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        marginTop: 2,
    },
});

export const NativeMediaPlayer = React.memo(NativeMediaPlayerComponent);
