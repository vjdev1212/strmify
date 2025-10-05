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
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from '@react-native-assets/slider';
import { showAlert } from "@/utils/platform";
import { styles } from "./styles";
import { MediaPlayerProps, DownloadResponse } from "./models";
import { playHaptic, formatTime } from "./utils";
import { parseSubtitleFile } from "./subtitle";

// Subtitle state management
const useSubtitleState = () => {
    const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
    const [parsedSubtitles, setParsedSubtitles] = useState<any[]>([]);
    const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);

    return {
        currentSubtitle, setCurrentSubtitle,
        parsedSubtitles, setParsedSubtitles,
        isLoadingSubtitles, setIsLoadingSubtitles,
    };
};

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    onBack,
    artwork,
    subtitles = [],
    openSubtitlesClient
}) => {
    const videoRef = useRef<VideoView>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [selectedSubtitle, setSelectedSubtitle] = useState<number>(-1);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [showAudioMenu, setShowAudioMenu] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [contentFit, setContentFit] = useState<'contain' | 'cover' | 'fill'>('cover');
    const [showContentFitLabel, setShowContentFitLabel] = useState(false);

    // Subtitle state
    const subtitleState = useSubtitleState();

    // Check if we should use custom subtitles
    const useCustomSubtitles = subtitles.length > 0;

    // Animated values
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const progressBarValue = useRef(new Animated.Value(0)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;
    const contentFitLabelOpacity = useRef(new Animated.Value(0)).current;

    // Timers
    const hideControlsTimer = useRef<any>(null);
    const contentFitLabelTimer = useRef<any>(null);

    // Content fit options cycle
    const contentFitOptions: Array<'contain' | 'cover' | 'fill'> = ['contain', 'cover', 'fill'];

    // Initialize player
    const player = useVideoPlayer({
        uri: videoUrl,
        metadata: {
            title: title,
            artwork: artwork
        }
    }, (player) => {
        player.loop = false;
        player.muted = isMuted;
        player.playbackRate = playbackSpeed;
    });

    // Setup orientation
    useEffect(() => {
        const setupOrientation = async () => {
            try {
                if (Platform.OS !== 'web') {
                    await ScreenOrientation.lockAsync(
                        ScreenOrientation.OrientationLock.LANDSCAPE
                    );
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

            if (hideControlsTimer.current) {
                clearTimeout(hideControlsTimer.current);
            }
            if (contentFitLabelTimer.current) {
                clearTimeout(contentFitLabelTimer.current);
            }
        };
    }, []);

    // Update player settings
    useEffect(() => {
        if (player) {
            player.muted = isMuted;
            player.playbackRate = playbackSpeed;
        }
    }, [player, isMuted, playbackSpeed]);

    // Load custom subtitles when selection changes
    useEffect(() => {
        if (!useCustomSubtitles) {
            // Clear custom subtitles if array is empty
            subtitleState.setParsedSubtitles([]);
            subtitleState.setCurrentSubtitle('');
            return;
        }

        if (selectedSubtitle >= 0 && selectedSubtitle < subtitles.length) {
            const selectedSub = subtitles[selectedSubtitle];

            if (selectedSub.fileId && openSubtitlesClient) {
                subtitleState.setIsLoadingSubtitles(true);
                console.log('Downloading subtitle from OpenSubtitles, fileId:', selectedSub.fileId);

                openSubtitlesClient.downloadSubtitle(String(selectedSub.fileId))
                    .then(async (response) => {
                        if (('status' in response && response.status !== 200) ||
                            ('success' in response && response.success === false) ||
                            ('error' in response && response.error)) {

                            let errorMessage: string = 'Unknown error occurred';
                            if ('error' in response && response.error) {
                                errorMessage = response.error as string;
                            } else if ('message' in response && response.message) {
                                errorMessage = response.message as string;
                            }

                            console.error('OpenSubtitles API error:', errorMessage);
                            subtitleState.setIsLoadingSubtitles(false);
                            subtitleState.setParsedSubtitles([]);
                            showAlert("Subtitle Error", `Failed to download subtitle: ${errorMessage}`);
                            return;
                        }

                        const downloadResponse = response as DownloadResponse;
                        console.log('Subtitle download response:', downloadResponse);

                        if (!downloadResponse.link) {
                            throw new Error('No download link provided');
                        }

                        const subtitleResponse = await fetch(downloadResponse.link);
                        if (!subtitleResponse.ok) {
                            throw new Error(`HTTP error! status: ${subtitleResponse.status}`);
                        }

                        const subtitleContent = await subtitleResponse.text();
                        console.log('Subtitle content loaded, length:', subtitleContent.length);
                        
                        const parsed = parseSubtitleFile(subtitleContent);
                        console.log('Parsed subtitles count:', parsed.length);

                        subtitleState.setParsedSubtitles(parsed);
                        subtitleState.setIsLoadingSubtitles(false);
                        subtitleState.setCurrentSubtitle(''); // Reset current subtitle
                    })
                    .catch(error => {
                        console.error('Failed to download/parse subtitle:', error);
                        subtitleState.setIsLoadingSubtitles(false);
                        subtitleState.setParsedSubtitles([]);
                        showAlert("Subtitle Error", `Failed to load subtitle: ${error.message}`);
                    });
            }
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

                        const parsed = parseSubtitleFile(subtitleContent);
                        console.log('Parsed subtitles count:', parsed.length);

                        subtitleState.setParsedSubtitles(parsed);
                        subtitleState.setIsLoadingSubtitles(false);
                        subtitleState.setCurrentSubtitle(''); // Reset current subtitle
                    })
                    .catch(error => {
                        console.error('Failed to load subtitles from URL:', error);
                        subtitleState.setIsLoadingSubtitles(false);
                        subtitleState.setParsedSubtitles([]);
                        showAlert("Subtitle Error", `Failed to load subtitle: ${error.message}`);
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
    }, [selectedSubtitle, subtitles, openSubtitlesClient, useCustomSubtitles]);

    // Update subtitle based on current time
    useEffect(() => {
        if (subtitleState.parsedSubtitles.length === 0) {
            if (subtitleState.currentSubtitle !== '') {
                subtitleState.setCurrentSubtitle('');
            }
            return;
        }

        const activeSubtitle = subtitleState.parsedSubtitles.find(
            sub => currentTime >= sub.start && currentTime <= sub.end
        );

        const newSubtitleText = activeSubtitle ? activeSubtitle.text : '';

        if (newSubtitleText !== subtitleState.currentSubtitle) {
            subtitleState.setCurrentSubtitle(newSubtitleText);
        }
    }, [currentTime, subtitleState.parsedSubtitles]);

    // Playing state change handler
    const playingChange = useEvent(player, "playingChange");
    useEffect(() => {
        if (!playingChange) return;

        const { isPlaying: playing } = playingChange;
        setIsPlaying(playing);

        if (playing) {
            setIsBuffering(false);
            Animated.timing(bufferOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [playingChange, bufferOpacity]);

    // Time update handler
    const timeUpdate = useEvent(player, "timeUpdate");
    useEffect(() => {
        if (!timeUpdate || isDragging) return;

        const { currentTime: time } = timeUpdate;
        setCurrentTime(time);

        const videoDuration = player.duration || 0;
        if (videoDuration > 0 && duration !== videoDuration) {
            setDuration(videoDuration);
        }

        if (videoDuration > 0) {
            const progress = time / videoDuration;
            progressBarValue.setValue(Math.max(0, Math.min(1, progress)));
        }
    }, [timeUpdate, player.duration, isDragging, duration]);

    // Status change handler
    const statusChange = useEvent(player, "statusChange");
    useEffect(() => {
        if (!statusChange) return;

        const { status, error } = statusChange;
        if (error) {
            console.log('Video error:', error.message);
        }

        switch (status) {
            case "loading":
                if (!isReady) {
                    setIsBuffering(true);
                    Animated.timing(bufferOpacity, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }).start();
                }
                break;

            case "readyToPlay":
                setIsBuffering(false);
                setIsReady(true);
                const videoDuration = player.duration || 0;
                if (videoDuration > 0) {
                    setDuration(videoDuration);
                }
                Animated.timing(bufferOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start();

                player.play();
                break;

            case "error":
                showAlert("Video Error", "Failed to load video.");
                setIsBuffering(false);
                setIsReady(false);
                break;
        }
    }, [statusChange, player, bufferOpacity, isReady]);

    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);

        Animated.timing(controlsOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();

        if (hideControlsTimer.current) {
            clearTimeout(hideControlsTimer.current);
        }

        hideControlsTimer.current = setTimeout(() => {
            if (isPlaying && !showSpeedMenu && !showSubtitleMenu && !showAudioMenu) {
                Animated.timing(controlsOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => {
                    setShowControls(false);
                });
            }
        }, 3000);
    }, [isPlaying, controlsOpacity, showSpeedMenu, showSubtitleMenu, showAudioMenu]);

    const togglePlayPause = useCallback(async () => {
        if (!isReady) return;

        await playHaptic();
        if (isPlaying) {
            player.pause();
        } else {
            player.play();
        }
        showControlsTemporarily();
    }, [isPlaying, player, isReady, showControlsTemporarily]);

    const togglePictureInPicture = useCallback(async () => {
        try {
            await playHaptic();
            if (videoRef.current && player && isReady) {
                await videoRef.current.startPictureInPicture();
            }
            showControlsTemporarily();
        } catch (error) {
            console.warn("PiP error:", error);
            showAlert("Picture-in-Picture", "PiP mode is not supported on this device.");
        }
    }, [showControlsTemporarily, player, isReady]);

    const cycleContentFit = useCallback(async () => {
        await playHaptic();
        const currentIndex = contentFitOptions.indexOf(contentFit);
        const nextIndex = (currentIndex + 1) % contentFitOptions.length;
        setContentFit(contentFitOptions[nextIndex]);

        setShowContentFitLabel(true);
        Animated.timing(contentFitLabelOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();

        if (contentFitLabelTimer.current) {
            clearTimeout(contentFitLabelTimer.current);
        }

        contentFitLabelTimer.current = setTimeout(() => {
            Animated.timing(contentFitLabelOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setShowContentFitLabel(false);
            });
        }, 1000);

        showControlsTemporarily();
    }, [contentFit, showControlsTemporarily]);

    const seekTo = useCallback((seconds: number) => {
        if (!isReady || duration <= 0) return;

        const clampedTime = Math.max(0, Math.min(duration, seconds));
        player.currentTime = clampedTime;
        setCurrentTime(clampedTime);
        showControlsTemporarily();
    }, [duration, player, showControlsTemporarily, isReady]);

    const skipTime = useCallback(async (seconds: number) => {
        if (!isReady || duration <= 0) return;

        await playHaptic();
        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        seekTo(newTime);
    }, [currentTime, duration, seekTo, isReady]);

    const toggleMute = useCallback(async () => {
        await playHaptic();
        setIsMuted(!isMuted);
        showControlsTemporarily();
    }, [isMuted, showControlsTemporarily]);

    const changePlaybackSpeed = useCallback(async (speed: number) => {
        await playHaptic();
        setPlaybackSpeed(speed);
        setShowSpeedMenu(false);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleSliderValueChange = useCallback((value: number) => {
        if (!isReady || duration <= 0) return;

        setIsDragging(true);
        setDragPosition(value);
        progressBarValue.setValue(value);

        const newTime = value * duration;
        setCurrentTime(newTime);
    }, [duration, isReady]);

    const handleSliderSlidingStart = useCallback(() => {
        setIsDragging(true);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleSliderSlidingComplete = useCallback((value: number) => {
        if (!isReady || duration <= 0) {
            setIsDragging(false);
            return;
        }

        setIsDragging(false);
        const newTime = value * duration;
        seekTo(newTime);
    }, [duration, seekTo, isReady]);

    const handleOverlayPress = useCallback(() => {
        if (showSpeedMenu || showSubtitleMenu || showAudioMenu) {
            setShowSpeedMenu(false);
            setShowSubtitleMenu(false);
            setShowAudioMenu(false);
        }
        else if (showControls) {
            Animated.timing(controlsOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setShowControls(false);
            });
        }
        else {
            showControlsTemporarily();
        }
    }, [showSpeedMenu, showSubtitleMenu, showAudioMenu, showControls, controlsOpacity, showControlsTemporarily]);

    const selectSubtitle = useCallback(async (index: number) => {
        await playHaptic();
        setSelectedSubtitle(index);
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const getContentFitIcon = useCallback(() => {
        switch (contentFit) {
            case 'contain': return 'fit-screen';
            case 'cover': return 'crop';
            case 'fill': return 'fullscreen';
            default: return 'fit-screen';
        }
    }, [contentFit]);

    const displayTime = isDragging ? dragPosition * duration : currentTime;
    const sliderValue = isDragging ? dragPosition : (duration > 0 ? currentTime / duration : 0);

    return (
        <View style={styles.container}>
            <VideoView
                ref={videoRef}
                style={styles.video}
                player={player}
                fullscreenOptions={{
                    enable: true,
                    orientation: 'landscape',
                }}
                allowsPictureInPicture={true}
                nativeControls={false}
                contentFit={contentFit}
            />

            {artwork && isBuffering && (
                <View style={styles.artworkContainer}>
                    <Image
                        source={{ uri: artwork }}
                        style={styles.artworkImage}
                        resizeMode="cover"
                    />
                    <View style={styles.artworkOverlay} />
                </View>
            )}

            {isBuffering && (
                <Animated.View
                    style={[
                        styles.bufferingContainer,
                        { opacity: bufferOpacity }
                    ]}
                    pointerEvents="none"
                >
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.bufferingText}>Loading...</Text>
                </Animated.View>
            )}

            <TouchableOpacity
                style={styles.touchArea}
                activeOpacity={1}
                onPress={handleOverlayPress}
            />

            {/* Custom subtitle display - only show if using custom subtitles */}
            {useCustomSubtitles && subtitleState.currentSubtitle && (
                <View style={styles.subtitleContainer} pointerEvents="none">
                    <View style={styles.subtitleBackground}>
                        <Text style={styles.subtitleText}>
                            {subtitleState.currentSubtitle}
                        </Text>
                    </View>
                </View>
            )}

            {!isReady && (
                <View style={styles.persistentBackButton} pointerEvents="box-none">
                    <TouchableOpacity
                        style={styles.backButtonPersistent}
                        onPress={async () => {
                            await playHaptic();
                            onBack();
                        }}
                    >
                        <View style={styles.backButtonGradient}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {showControls && (
                <Animated.View
                    style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
                    pointerEvents="box-none"
                >
                    <LinearGradient
                        colors={['rgba(0,0,0,0.8)', 'transparent']}
                        style={styles.topControls}
                    >
                        <TouchableOpacity style={styles.backButton} onPress={async () => { await playHaptic(); onBack(); }}>
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
                                onPress={toggleMute}
                            >
                                <Ionicons
                                    name={isMuted ? "volume-mute" : "volume-high"}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={cycleContentFit}
                            >
                                <MaterialIcons
                                    name={getContentFitIcon()}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {player.availableAudioTracks.length > 0 && (
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={async () => {
                                        await playHaptic();
                                        setShowAudioMenu(!showAudioMenu);
                                        setShowSpeedMenu(false);
                                        setShowSubtitleMenu(false);
                                    }}
                                >
                                    <MaterialIcons
                                        name="audiotrack"
                                        size={24}
                                        color="white"
                                    />
                                </TouchableOpacity>
                            )}

                            {/* Show subtitle button based on custom or native subtitles */}
                            {(useCustomSubtitles || player.availableSubtitleTracks.length > 0) && (
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={async () => {
                                        await playHaptic();
                                        setShowSubtitleMenu(!showSubtitleMenu);
                                        setShowSpeedMenu(false);
                                        setShowAudioMenu(false);
                                    }}
                                >
                                    <MaterialIcons
                                        name="closed-caption"
                                        size={24}
                                        color={selectedSubtitle >= 0 ? "#007AFF" : "white"}
                                    />
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={togglePictureInPicture}
                            >
                                <MaterialIcons
                                    name="picture-in-picture-alt"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={async () => {
                                    await playHaptic();
                                    setShowSpeedMenu(!showSpeedMenu);
                                    setShowSubtitleMenu(false);
                                    setShowAudioMenu(false);
                                }}
                            >
                                <MaterialIcons
                                    name="speed"
                                    size={24}
                                    color={playbackSpeed !== 1.0 ? "#007AFF" : "white"}
                                />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {!isBuffering && (
                        <View style={styles.centerControls}>
                            <TouchableOpacity
                                style={[styles.skipButton, !isReady && styles.disabledButton]}
                                onPress={() => skipTime(-10)}
                                disabled={!isReady}
                            >
                                <MaterialIcons
                                    name="replay-10"
                                    size={36}
                                    color={isReady ? "white" : "rgba(255,255,255,0.5)"}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.playButton, !isReady && styles.disabledButton]}
                                onPress={togglePlayPause}
                                disabled={!isReady}
                            >
                                <Ionicons
                                    name={isPlaying ? "pause" : "play"}
                                    size={60}
                                    color={isReady ? "white" : "rgba(255,255,255,0.5)"}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.skipButton, !isReady && styles.disabledButton]}
                                onPress={() => skipTime(30)}
                                disabled={!isReady}
                            >
                                <MaterialIcons
                                    name="forward-30"
                                    size={36}
                                    color={isReady ? "white" : "rgba(255,255,255,0.5)"}
                                />
                            </TouchableOpacity>
                        </View>
                    )}

                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.bottomControls}
                    >
                        <View style={styles.timeContainer}>
                            <Text style={styles.timeText}>
                                {formatTime(displayTime)}
                            </Text>
                            <Text style={styles.timeText}>
                                {formatTime(duration)}
                            </Text>
                        </View>

                        <View style={styles.progressContainerWithMargin}>
                            <Slider
                                style={styles.progressSlider}
                                minimumValue={0}
                                maximumValue={1}
                                value={sliderValue}
                                onValueChange={handleSliderValueChange}
                                onSlidingStart={handleSliderSlidingStart}
                                onSlidingComplete={handleSliderSlidingComplete}
                                minimumTrackTintColor="#007AFF"
                                maximumTrackTintColor="rgba(255,255,255,0.3)"
                                thumbTintColor={'#fff'}
                                thumbSize={20}
                                trackHeight={5}
                                enabled={isReady || duration >= 0}
                            />
                        </View>

                        {playbackSpeed !== 1.0 && (
                            <View style={styles.bottomRightControls}>
                                <Text style={styles.speedText}>
                                    {playbackSpeed}x
                                </Text>
                            </View>
                        )}
                    </LinearGradient>
                </Animated.View>
            )}

            {/* Speed Menu */}
            {showSpeedMenu && (
                <TouchableOpacity
                    style={styles.settingsOverlay}
                    activeOpacity={1}
                    onPress={() => setShowSpeedMenu(false)}
                >
                    <TouchableOpacity
                        style={styles.settingsPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <ScrollView style={styles.settingsContent}>
                            <Text style={styles.settingsTitle}>Playback Speed</Text>
                            <View style={styles.speedOptions}>
                                {[0.75, 0.8, 0.9, 1.0, 1.1, 1.2, 1.25, 1.5, 1.75, 2.0].map(speed => (
                                    <TouchableOpacity
                                        key={speed}
                                        style={[
                                            styles.speedOption,
                                            playbackSpeed === speed && styles.speedOptionSelected
                                        ]}
                                        onPress={() => changePlaybackSpeed(speed)}
                                    >
                                        <Text style={[
                                            styles.speedOptionText,
                                            playbackSpeed === speed && styles.speedOptionTextSelected
                                        ]}>
                                            {speed}x
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Subtitle Menu - Show custom subtitles if available, otherwise native */}
            {showSubtitleMenu && (
                <TouchableOpacity
                    style={styles.settingsOverlay}
                    activeOpacity={1}
                    onPress={() => setShowSubtitleMenu(false)}
                >
                    <TouchableOpacity
                        style={styles.settingsPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={styles.settingsTitle}>Subtitles</Text>
                        
                        {subtitleState.isLoadingSubtitles && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#007AFF" />
                                <Text style={styles.loadingText}>Loading subtitles...</Text>
                            </View>
                        )}

                        <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
                            {useCustomSubtitles ? (
                                // Show custom subtitles
                                <>
                                    <TouchableOpacity
                                        style={[
                                            styles.subtitleOption,
                                            selectedSubtitle === -1 && styles.subtitleOptionSelected
                                        ]}
                                        onPress={() => {
                                            selectSubtitle(-1);
                                            setShowSubtitleMenu(false);
                                        }}
                                    >
                                        <Text style={styles.subtitleOptionText}>Off</Text>
                                        {selectedSubtitle === -1 && (
                                            <Ionicons name="checkmark" size={20} color="#007AFF" />
                                        )}
                                    </TouchableOpacity>

                                    {subtitles.map((sub, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.subtitleOption,
                                                selectedSubtitle === index && styles.subtitleOptionSelected
                                            ]}
                                            onPress={() => {
                                                selectSubtitle(index);
                                                setShowSubtitleMenu(false);
                                            }}
                                        >
                                            <View style={styles.subtitleOptionContent}>
                                                <Text style={styles.subtitleOptionText} numberOfLines={2}>
                                                    {sub.label}
                                                </Text>
                                                {sub.fileId && (
                                                    <Text style={styles.subtitleSourceText}>
                                                        OpenSubtitles
                                                    </Text>
                                                )}
                                                {!sub.fileId && sub.url && !sub.url.includes('opensubtitles.org') && (
                                                    <Text style={styles.subtitleSourceText}>
                                                        Direct URL
                                                    </Text>
                                                )}
                                            </View>
                                            {selectedSubtitle === index && (
                                                <Ionicons name="checkmark" size={20} color="#007AFF" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </>
                            ) : (
                                // Show native video subtitles
                                <>
                                    <TouchableOpacity
                                        style={[
                                            styles.subtitleOption,
                                            selectedSubtitle === -1 && styles.subtitleOptionSelected
                                        ]}
                                        onPress={async () => {
                                            await playHaptic();
                                            setSelectedSubtitle(-1);
                                            player.subtitleTrack = null;
                                            setShowSubtitleMenu(false);
                                        }}
                                    >
                                        <Text style={styles.subtitleOptionText}>Off</Text>
                                        {selectedSubtitle === -1 && (
                                            <Ionicons name="checkmark" size={20} color="#007AFF" />
                                        )}
                                    </TouchableOpacity>
                                    {player.availableSubtitleTracks.map((sub, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.subtitleOption,
                                                selectedSubtitle === index && styles.subtitleOptionSelected
                                            ]}
                                            onPress={async () => {
                                                await playHaptic();
                                                setSelectedSubtitle(index);
                                                player.subtitleTrack = sub;
                                                setShowSubtitleMenu(false);
                                            }}
                                        >
                                            <Text style={styles.subtitleOptionText}>
                                                {sub.label}
                                            </Text>
                                            {selectedSubtitle === index && (
                                                <Ionicons name="checkmark" size={20} color="#007AFF" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Audio Track Menu */}
            {showAudioMenu && (
                <TouchableOpacity
                    style={styles.settingsOverlay}
                    activeOpacity={1}
                    onPress={() => setShowAudioMenu(false)}
                >
                    <TouchableOpacity
                        style={styles.settingsPanel}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <ScrollView style={styles.settingsContent}>
                            <Text style={styles.settingsTitle}>Audio Track</Text>
                            <View style={styles.audioOptions}>
                                {player.availableAudioTracks.map((track, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.audioOption,
                                            selectedAudioTrack === index && styles.audioOptionSelected
                                        ]}
                                        onPress={async () => {
                                            await playHaptic();
                                            setSelectedAudioTrack(index);
                                            player.audioTrack = track;
                                            setShowAudioMenu(false);
                                        }}
                                    >
                                        <Text style={styles.audioOptionText}>
                                            {track.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}
        </View>
    );
};