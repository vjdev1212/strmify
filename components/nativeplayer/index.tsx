import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    StatusBar,
    PanResponder,
    ScrollView,
    ActivityIndicator,
    Platform,
    Image,
} from "react-native";
import { AudioTrack, SubtitleTrack, useVideoPlayer, VideoContentFit, VideoView } from "expo-video";
import { useEvent } from "expo";
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from '@react-native-assets/slider';
import { showAlert } from "@/utils/platform";
import * as Haptics from 'expo-haptics';
import { styles } from "./styles";
import { MediaPlayerProps } from "./models";
import { playHaptic } from "./utils";


export const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    onBack,
    artwork,
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
    const [isMuted, setIsMuted] = useState(true);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [showAudioMenu, setShowAudioMenu] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [contentFit, setContentFit] = useState<VideoContentFit>('cover');
    const [showContentFitLabel, setShowContentFitLabel] = useState(false);


    // Content fit options cycle
    const contentFitOptions: VideoContentFit[] = ['contain', 'cover', 'fill'];

    // Animated values
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const progressBarValue = useRef(new Animated.Value(0)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;
    const contentFitLabelOpacity = useRef(new Animated.Value(0)).current;

    // Auto-hide controls timer
    const hideControlsTimer = useRef<any>(null);
    const contentFitLabelTimer = useRef<any>(null);

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

    useEffect(() => {
        if (player) {
            player.muted = isMuted;
            player.playbackRate = playbackSpeed;

            if (typeof window !== 'undefined' && window.AudioContext) {
                const audioContext = new (window.AudioContext)();
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
            }
        }
    }, [player, isMuted, playbackSpeed]);

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

        // Get duration from player
        const videoDuration = player.duration || 0;
        if (videoDuration > 0 && duration !== videoDuration) {
            setDuration(videoDuration);
        }

        // Update progress bar
        if (videoDuration > 0) {
            const progress = time / videoDuration;
            progressBarValue.setValue(progress);
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
                // Only show buffering if not ready yet
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
                // Get duration when ready
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
                showAlert("Video Error", "Failed to load video. Use external media players for better playback.");
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

    // Control functions
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
            showAlert("Picture-in-Picture", "PiP mode is not supported on this device or video is not ready.");
        }
    }, [showControlsTemporarily, player, isReady]);

    const cycleContentFit = useCallback(async () => {
        await playHaptic();
        const currentIndex = contentFitOptions.indexOf(contentFit);
        const nextIndex = (currentIndex + 1) % contentFitOptions.length;
        setContentFit(contentFitOptions[nextIndex]);

        // Show the label briefly
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
        player.seekBy(clampedTime);
        setCurrentTime(clampedTime);
        showControlsTemporarily();
    }, [duration, player, showControlsTemporarily, isReady]);

    const skipTime = useCallback(async (seconds: number) => {
        if (!isReady || duration <= 0) return;

        await playHaptic();
        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        seekTo(newTime);
    }, [currentTime, duration, seekTo, isReady]);

    // Separate mute toggle
    const toggleMute = useCallback(async () => {
        await playHaptic();
        setIsMuted(!isMuted);
        showControlsTemporarily();
    }, [isMuted, showControlsTemporarily]);

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

    const changePlaybackSpeed = useCallback(async (speed: number) => {
        await playHaptic();
        setPlaybackSpeed(speed);
        setShowSpeedMenu(false);
        showControlsTemporarily();
    }, [showControlsTemporarily]);


    // Fixed progress bar with proper slider functionality
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

    // Close panels when touching outside
    const handleOverlayPress = useCallback(() => {
        if (showSpeedMenu || showSubtitleMenu || showAudioMenu) {
            setShowSpeedMenu(false);
            setShowSubtitleMenu(false);
            setShowAudioMenu(false);
        }
        else if (showControls) {
            // Hide controls immediately if already showing
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

    const getContentFitIcon = useCallback(() => {
        switch (contentFit) {
            case 'contain': return 'fit-screen';
            case 'cover': return 'crop';
            case 'fill': return 'fullscreen';
            default: return 'fit-screen';
        }
    }, [contentFit]);

    const getContentFitLabel = useCallback(() => {
        switch (contentFit) {
            case 'contain': return 'Fit';
            case 'cover': return 'Fill';
            case 'fill': return 'Stretch';
            default: return 'Fit';
        }
    }, [contentFit]);

    const displayTime = isDragging ? dragPosition * duration : currentTime;
    const sliderValue = isDragging ? dragPosition : (duration > 0 ? currentTime / duration : 0);

    return (
        <View style={styles.container}>
            <VideoView
                ref={videoRef}
                style={[styles.video,]}
                player={player}
                fullscreenOptions={
                    {
                        enable: true,
                        orientation: 'landscape',
                        autoExitOnRotate: true
                    }
                }
                allowsPictureInPicture={true}
                nativeControls={false}
                contentFit={contentFit}
                crossOrigin="anonymous"
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

            {/* Loading indicator */}
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

            {/* Touch area for showing controls */}
            <TouchableOpacity
                style={styles.touchArea}
                activeOpacity={1}
                onPress={handleOverlayPress}
            />

            {/* Controls overlay */}
            {showControls && (
                <Animated.View
                    style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
                    pointerEvents="box-none"
                >
                    {/* Top controls */}
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
                            {/* Separate Mute button */}
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

                            {/* Content fit control */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={async () => { await playHaptic(); cycleContentFit(); }}
                            >
                                <MaterialIcons
                                    name={getContentFitIcon()}
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {/* Audio Track */}
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

                            {/* Subtitles */}
                            {player.availableSubtitleTracks.length > 0 && (
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
                                        color="white"
                                    />
                                </TouchableOpacity>
                            )}

                            {/* Picture in Picture */}
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={async () => { await playHaptic(); togglePictureInPicture(); }}
                            >
                                <MaterialIcons
                                    name="picture-in-picture-alt"
                                    size={24}
                                    color="white"
                                />
                            </TouchableOpacity>

                            {/* Playback Speed */}
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
                                    color="white"
                                />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* Center controls - Hidden during buffering */}
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

                    {/* Bottom controls */}
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

                        {/* Fixed progress bar with proper slider */}
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

                        {/* Only show speed when not default */}
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

            {/* Subtitle Menu */}
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
                        <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
                            <Text style={styles.settingsTitle}>Subtitles</Text>
                            <View style={styles.subtitleOptions}>
                                <TouchableOpacity
                                    style={[
                                        styles.subtitleOption,
                                        selectedSubtitle === null && styles.subtitleOptionSelected
                                    ]}
                                    onPress={async () => {
                                        await playHaptic();
                                        setSelectedSubtitle(-1);
                                        player.subtitleTrack = null;
                                        setShowSubtitleMenu(false);
                                    }}
                                >
                                    <Text style={styles.subtitleOptionText}>Off</Text>
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
                                    </TouchableOpacity>
                                ))}
                            </View>
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