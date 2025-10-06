import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    View, Text, TouchableOpacity, Animated, StatusBar,
    ScrollView, ActivityIndicator, Platform, Image,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import * as ScreenOrientation from "expo-screen-orientation";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import Slider from '@react-native-assets/slider';
import { showAlert } from "@/utils/platform";
import { styles } from "./styles";
import { MediaPlayerProps, DownloadResponse } from "./models";
import { playHaptic, formatTime } from "./utils";
import { parseSubtitleFile } from "./subtitle";

// Constants
const CONTROLS_HIDE_DELAY = 3000;
const CONTENT_FIT_LABEL_DELAY = 1000;
const SUBTITLE_UPDATE_INTERVAL = 100;
const PLAYBACK_SPEEDS = [0.75, 0.8, 0.9, 1.0, 1.1, 1.2, 1.25, 1.5, 1.75, 2.0];
const CONTENT_FIT_OPTIONS: Array<'contain' | 'cover' | 'fill'> = ['contain', 'cover', 'fill'];

// Subtitle hook
const useSubtitles = () => {
    const [currentSubtitle, setCurrentSubtitle] = useState('');
    const [parsedSubtitles, setParsedSubtitles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    return { currentSubtitle, setCurrentSubtitle, parsedSubtitles, setParsedSubtitles, isLoading, setIsLoading };
};

// Menu state hook
const useMenuState = () => {
    const [showSpeed, setShowSpeed] = useState(false);
    const [showSubtitle, setShowSubtitle] = useState(false);
    const [showAudio, setShowAudio] = useState(false);

    const closeAll = () => {
        setShowSpeed(false);
        setShowSubtitle(false);
        setShowAudio(false);
    };

    const isAnyOpen = showSpeed || showSubtitle || showAudio;

    return { showSpeed, setShowSpeed, showSubtitle, setShowSubtitle, showAudio, setShowAudio, closeAll, isAnyOpen };
};

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl, title, onBack, artwork, subtitles = [], openSubtitlesClient, onSwitchMediaPlayer
}) => {
    const videoRef = useRef<VideoView>(null);
    const hideControlsTimer = useRef<any>(null);
    const contentFitLabelTimer = useRef<any>(null);

    // Animation refs
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const bufferOpacity = useRef(new Animated.Value(1)).current;
    const contentFitLabelOpacity = useRef(new Animated.Value(0)).current;

    // Player state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [loadingText, setLoadingText] = useState('Loading...');

    // UI state
    const [showControls, setShowControls] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const [contentFit, setContentFit] = useState<'contain' | 'cover' | 'fill'>('cover');
    const [showContentFitLabel, setShowContentFitLabel] = useState(false);

    // Settings state
    const [selectedSubtitle, setSelectedSubtitle] = useState(-1);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState(-1);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);

    // Custom hooks
    const subtitleState = useSubtitles();
    const menuState = useMenuState();

    const useCustomSubtitles = subtitles.length > 0;

    // Initialize player
    const player = useVideoPlayer({
        uri: videoUrl,
        metadata: { title, artwork }
    }, (player) => {
        player.loop = false;
        player.muted = isMuted;
        player.playbackRate = playbackSpeed;
    });

    // Orientation and cleanup
    useEffect(() => {
        const setupOrientation = async () => {
            if (Platform.OS !== 'web') {
                try {
                    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                    StatusBar.setHidden(true);
                } catch (error) {
                    console.warn("Failed to set orientation:", error);
                }
            }
        };

        setupOrientation();

        return () => {
            if (Platform.OS !== 'web') {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                StatusBar.setHidden(false);
            }
            clearTimeout(hideControlsTimer.current);
            clearTimeout(contentFitLabelTimer.current);
        };
    }, []);

    // Update player settings
    useEffect(() => {
        if (player) {
            player.muted = isMuted;
            player.playbackRate = playbackSpeed;
        }
    }, [player, isMuted, playbackSpeed]);

    // Load subtitles
    useEffect(() => {
        if (!useCustomSubtitles || selectedSubtitle < 0 || selectedSubtitle >= subtitles.length) {
            subtitleState.setParsedSubtitles([]);
            subtitleState.setCurrentSubtitle('');
            return;
        }

        const loadSubtitle = async (sub: any) => {
            subtitleState.setIsLoading(true);

            try {
                let subtitleContent = '';

                if (sub.fileId && openSubtitlesClient) {
                    const response = await openSubtitlesClient.downloadSubtitle(String(sub.fileId));
                    
                    if ('error' in response || 'status' in response && response.status !== 200) {
                        throw new Error(response.message || 'Download failed');
                    }

                    const downloadResponse = response as DownloadResponse;
                    if (!downloadResponse.link) throw new Error('No download link');

                    const subResponse = await fetch(downloadResponse.link);
                    if (!subResponse.ok) throw new Error(`HTTP ${subResponse.status}`);
                    subtitleContent = await subResponse.text();
                } else if (sub.url && !sub.url.includes('opensubtitles.org')) {
                    const response = await fetch(sub.url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    subtitleContent = await response.text();
                } else {
                    throw new Error('No valid subtitle source');
                }

                const parsed = parseSubtitleFile(subtitleContent);
                subtitleState.setParsedSubtitles(parsed);
            } catch (error: any) {
                console.error('Subtitle load error:', error);
                subtitleState.setParsedSubtitles([]);
                showAlert("Subtitle Error", `Failed to load: ${error.message}`);
            } finally {
                subtitleState.setIsLoading(false);
                subtitleState.setCurrentSubtitle('');
            }
        };

        loadSubtitle(subtitles[selectedSubtitle]);
    }, [selectedSubtitle, subtitles, openSubtitlesClient, useCustomSubtitles]);

    // Update subtitle display
    useEffect(() => {
        if (subtitleState.parsedSubtitles.length === 0) return;

        const updateSubtitle = () => {
            const time = player.currentTime;
            const active = subtitleState.parsedSubtitles.find(sub => time >= sub.start && time <= sub.end);
            subtitleState.setCurrentSubtitle(active?.text || '');
        };

        updateSubtitle();
        const interval = setInterval(updateSubtitle, SUBTITLE_UPDATE_INTERVAL);
        return () => clearInterval(interval);
    }, [subtitleState.parsedSubtitles, player]);

    // Player event handlers
    const playingChange = useEvent(player, "playingChange");
    useEffect(() => {
        if (!playingChange) return;
        setIsPlaying(playingChange.isPlaying);
        if (playingChange.isPlaying) {
            setIsBuffering(false);
            Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
    }, [playingChange]);

    const timeUpdate = useEvent(player, "timeUpdate");
    useEffect(() => {
        if (!timeUpdate || isDragging) return;
        
        setCurrentTime(timeUpdate.currentTime);
        const videoDuration = player.duration || 0;
        
        if (videoDuration > 0) {
            setDuration(videoDuration);
        }
    }, [timeUpdate, isDragging]);

    const statusChange = useEvent(player, "statusChange");
    useEffect(() => {
        if (!statusChange) return;

        const { status, error } = statusChange;
        if (error) console.log('Video error:', error.message);

        switch (status) {
            case "loading":
                if (!isReady) {
                    setIsBuffering(true);
                    Animated.timing(bufferOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
                }
                break;

            case "readyToPlay":
                setIsBuffering(false);
                setIsReady(true);
                setDuration(player.duration || 0);
                Animated.timing(bufferOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
                player.play();
                break;

            case "error":
                if (!isReady) {
                    showAlert("Playback Error", "Unable to load the video. Try with VLC.");
                    setLoadingText("Unable to load the video. Retrying with VLC...");
                }
                setIsBuffering(false);
                break;
        }
    }, [statusChange, isReady]);

    // Control helpers
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

        clearTimeout(hideControlsTimer.current);
        hideControlsTimer.current = setTimeout(() => {
            if (isPlaying && !menuState.isAnyOpen) {
                Animated.timing(controlsOpacity, { toValue: 0, duration: 500, useNativeDriver: true })
                    .start(() => setShowControls(false));
            }
        }, CONTROLS_HIDE_DELAY);
    }, [isPlaying, menuState.isAnyOpen]);

    const showContentFitLabelTemporarily = useCallback(() => {
        setShowContentFitLabel(true);
        Animated.timing(contentFitLabelOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

        clearTimeout(contentFitLabelTimer.current);
        contentFitLabelTimer.current = setTimeout(() => {
            Animated.timing(contentFitLabelOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
                .start(() => setShowContentFitLabel(false));
        }, CONTENT_FIT_LABEL_DELAY);
    }, []);

    // Control actions
    const togglePlayPause = useCallback(async () => {
        if (!isReady) return;
        await playHaptic();
        isPlaying ? player.pause() : player.play();
        showControlsTemporarily();
    }, [isPlaying, player, isReady, showControlsTemporarily]);

    const seekTo = useCallback((seconds: number) => {
        if (!isReady || duration <= 0) return;
        const clampedTime = Math.max(0, Math.min(duration, seconds));
        player.currentTime = clampedTime;
        setCurrentTime(clampedTime);
        showControlsTemporarily();
    }, [duration, player, isReady, showControlsTemporarily]);

    const skipTime = useCallback(async (seconds: number) => {
        if (!isReady) return;
        await playHaptic();
        seekTo(currentTime + seconds);
    }, [currentTime, seekTo, isReady]);

    const cycleContentFit = useCallback(async () => {
        await playHaptic();
        const currentIndex = CONTENT_FIT_OPTIONS.indexOf(contentFit);
        setContentFit(CONTENT_FIT_OPTIONS[(currentIndex + 1) % CONTENT_FIT_OPTIONS.length]);
        showContentFitLabelTemporarily();
        showControlsTemporarily();
    }, [contentFit, showControlsTemporarily]);

    const handleOverlayPress = useCallback(() => {
        if (menuState.isAnyOpen) {
            menuState.closeAll();
        } else if (showControls) {
            Animated.timing(controlsOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
                .start(() => setShowControls(false));
        } else {
            showControlsTemporarily();
        }
    }, [menuState.isAnyOpen, showControls, showControlsTemporarily]);

    // Slider handlers
    const handleSliderChange = useCallback((value: number) => {
        if (!isReady || duration <= 0) return;
        setIsDragging(true);
        setDragPosition(value);
        setCurrentTime(value * duration);
    }, [duration, isReady]);

    const handleSliderComplete = useCallback((value: number) => {
        setIsDragging(false);
        if (isReady && duration > 0) seekTo(value * duration);
    }, [duration, seekTo, isReady]);

    // Render helpers
    const getContentFitIcon = (): "fit-screen" | "crop" | "fullscreen" => {
        const icons = { contain: 'fit-screen', cover: 'crop', fill: 'fullscreen' } as const;
        return icons[contentFit];
    };

    const displayTime = isDragging ? dragPosition * duration : currentTime;
    const sliderValue = isDragging ? dragPosition : (duration > 0 ? currentTime / duration : 0);

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

            {artwork && isBuffering && (
                <View style={styles.artworkContainer}>
                    <Image source={{ uri: artwork }} style={styles.artworkImage} resizeMode="cover" />
                    <View style={styles.artworkOverlay} />
                </View>
            )}

            {isBuffering && (
                <Animated.View style={[styles.bufferingContainer, { opacity: bufferOpacity }]} pointerEvents="none">
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.bufferingText}>{loadingText}</Text>
                </Animated.View>
            )}

            <TouchableOpacity style={styles.touchArea} activeOpacity={1} onPress={handleOverlayPress} />

            {useCustomSubtitles && subtitleState.currentSubtitle && (
                <View style={styles.subtitleContainer} pointerEvents="none">
                    <View style={styles.subtitleBackground}>
                        <Text style={styles.subtitleText}>{subtitleState.currentSubtitle}</Text>
                    </View>
                </View>
            )}

            {!isReady && (
                <View style={styles.persistentBackButton} pointerEvents="box-none">
                    <TouchableOpacity style={styles.backButtonPersistent} onPress={async () => { await playHaptic(); onBack(); }}>
                        <View style={styles.backButtonGradient}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {showControls && (
                <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]} pointerEvents="box-none">
                    <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={styles.topControls}>
                        <TouchableOpacity style={styles.backButton} onPress={async () => { await playHaptic(); onBack(); }}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                        </View>

                        <View style={styles.topRightControls}>
                            {onSwitchMediaPlayer && (
                                <TouchableOpacity style={styles.controlButton} onPress={async () => { await playHaptic(); onSwitchMediaPlayer({ message: '', player: "native" }); }}>
                                    <MaterialCommunityIcons name="vlc" size={24} color="white" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.controlButton} onPress={async () => { await playHaptic(); setIsMuted(!isMuted); showControlsTemporarily(); }}>
                                <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.controlButton} onPress={cycleContentFit}>
                                <MaterialIcons name={getContentFitIcon()} size={24} color="white" />
                            </TouchableOpacity>
                            {player.availableAudioTracks.length > 0 && (
                                <TouchableOpacity style={styles.controlButton} onPress={async () => { await playHaptic(); menuState.setShowAudio(!menuState.showAudio); menuState.setShowSpeed(false); menuState.setShowSubtitle(false); }}>
                                    <MaterialIcons name="audiotrack" size={24} color="white" />
                                </TouchableOpacity>
                            )}
                            {(useCustomSubtitles || player.availableSubtitleTracks.length > 0) && (
                                <TouchableOpacity style={styles.controlButton} onPress={async () => { await playHaptic(); menuState.setShowSubtitle(!menuState.showSubtitle); menuState.setShowSpeed(false); menuState.setShowAudio(false); }}>
                                    <MaterialIcons name="closed-caption" size={24} color="white" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.controlButton} onPress={async () => { await playHaptic(); menuState.setShowSpeed(!menuState.showSpeed); menuState.setShowSubtitle(false); menuState.setShowAudio(false); }}>
                                <MaterialIcons name="speed" size={24} color={playbackSpeed !== 1.0 ? "#007AFF" : "white"} />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {!isBuffering && (
                        <View style={styles.centerControls}>
                            <TouchableOpacity style={[styles.skipButton, !isReady && styles.disabledButton]} onPress={() => skipTime(-10)} disabled={!isReady}>
                                <MaterialIcons name="replay-10" size={36} color={isReady ? "white" : "rgba(255,255,255,0.5)"} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.playButton, !isReady && styles.disabledButton]} onPress={togglePlayPause} disabled={!isReady}>
                                <Ionicons name={isPlaying ? "pause" : "play"} size={60} color={isReady ? "white" : "rgba(255,255,255,0.5)"} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.skipButton, !isReady && styles.disabledButton]} onPress={() => skipTime(30)} disabled={!isReady}>
                                <MaterialIcons name="forward-30" size={36} color={isReady ? "white" : "rgba(255,255,255,0.5)"} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomControls}>
                        <View style={styles.timeContainer}>
                            <Text style={styles.timeText}>{formatTime(displayTime)}</Text>
                            <Text style={styles.timeText}>{formatTime(duration)}</Text>
                        </View>
                        <View style={styles.progressContainerWithMargin}>
                            <Slider
                                style={styles.progressSlider}
                                minimumValue={0}
                                maximumValue={1}
                                value={sliderValue}
                                onValueChange={handleSliderChange}
                                onSlidingStart={() => { setIsDragging(true); showControlsTemporarily(); }}
                                onSlidingComplete={handleSliderComplete}
                                minimumTrackTintColor="#007AFF"
                                maximumTrackTintColor="rgba(255,255,255,0.3)"
                                thumbTintColor="#fff"
                                thumbSize={20}
                                trackHeight={5}
                                enabled={isReady}
                            />
                        </View>
                        {playbackSpeed !== 1.0 && (
                            <View style={styles.bottomRightControls}>
                                <Text style={styles.speedText}>{playbackSpeed}x</Text>
                            </View>
                        )}
                    </LinearGradient>
                </Animated.View>
            )}

            {/* Speed Menu */}
            {menuState.showSpeed && (
                <TouchableOpacity style={styles.settingsOverlay} activeOpacity={1} onPress={() => menuState.setShowSpeed(false)}>
                    <TouchableOpacity style={styles.settingsPanel} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                        <ScrollView style={styles.settingsContent}>
                            <Text style={styles.settingsTitle}>Playback Speed</Text>
                            <View style={styles.speedOptions}>
                                {PLAYBACK_SPEEDS.map(speed => (
                                    <TouchableOpacity
                                        key={speed}
                                        style={[styles.speedOption, playbackSpeed === speed && styles.speedOptionSelected]}
                                        onPress={async () => { await playHaptic(); setPlaybackSpeed(speed); menuState.setShowSpeed(false); showControlsTemporarily(); }}
                                    >
                                        <Text style={[styles.speedOptionText, playbackSpeed === speed && styles.speedOptionTextSelected]}>
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
            {menuState.showSubtitle && (
                <TouchableOpacity style={styles.settingsOverlay} activeOpacity={1} onPress={() => menuState.setShowSubtitle(false)}>
                    <TouchableOpacity style={styles.settingsPanel} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.settingsTitle}>Subtitles</Text>
                        {subtitleState.isLoading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#007AFF" />
                                <Text style={styles.loadingText}>Loading subtitles...</Text>
                            </View>
                        )}
                        <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[styles.subtitleOption, selectedSubtitle === -1 && styles.subtitleOptionSelected]}
                                onPress={async () => {
                                    await playHaptic();
                                    setSelectedSubtitle(-1);
                                    if (!useCustomSubtitles) player.subtitleTrack = null;
                                    menuState.setShowSubtitle(false);
                                }}
                            >
                                <Text style={styles.subtitleOptionText}>Off</Text>
                                {selectedSubtitle === -1 && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                            </TouchableOpacity>

                            {useCustomSubtitles ? (
                                subtitles.map((sub, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.subtitleOption, selectedSubtitle === i && styles.subtitleOptionSelected]}
                                        onPress={async () => { await playHaptic(); setSelectedSubtitle(i); menuState.setShowSubtitle(false); }}
                                    >
                                        <View style={styles.subtitleOptionContent}>
                                            <Text style={styles.subtitleOptionText} numberOfLines={2}>{sub.label}</Text>
                                            {sub.fileId && <Text style={styles.subtitleSourceText}>OpenSubtitles</Text>}
                                        </View>
                                        {selectedSubtitle === i && <Ionicons name="checkmark" size={20} color="#ffffff" />}
                                    </TouchableOpacity>
                                ))
                            ) : (
                                player.availableSubtitleTracks.map((sub, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.subtitleOption, selectedSubtitle === i && styles.subtitleOptionSelected]}
                                        onPress={async () => { await playHaptic(); setSelectedSubtitle(i); player.subtitleTrack = sub; menuState.setShowSubtitle(false); }}
                                    >
                                        <Text style={styles.subtitleOptionText}>{sub.label}</Text>
                                        {selectedSubtitle === i && <Ionicons name="checkmark" size={20} color="#ffffff" />}
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Audio Menu */}
            {menuState.showAudio && (
                <TouchableOpacity style={styles.settingsOverlay} activeOpacity={1} onPress={() => menuState.setShowAudio(false)}>
                    <TouchableOpacity style={styles.settingsPanel} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                        <ScrollView style={styles.settingsContent}>
                            <Text style={styles.settingsTitle}>Audio Track</Text>
                            {player.availableAudioTracks.map((track, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.audioOption, selectedAudioTrack === i && styles.audioOptionSelected]}
                                    onPress={async () => { await playHaptic(); setSelectedAudioTrack(i); player.audioTrack = track; menuState.setShowAudio(false); }}
                                >
                                    <Text style={styles.audioOptionText}>{track.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            )}
        </View>
    );
};