import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import * as ScreenOrientation from "expo-screen-orientation";

export interface Subtitle {
    language: string;
    url: string;
    label: string;
}

export interface Chapter {
    title: string;
    start: number; // in seconds
}

interface MediaPlayerProps {
    videoUrl: string;
    title: string;
    subtitle?: string;
    subtitles: Subtitle[];
    chapters: Chapter[];
    onBack: () => void;
    autoPlay?: boolean;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
    videoUrl,
    title,
    subtitles,
    chapters,
    onBack,
    autoPlay = true,
}) => {
    const videoRef = useRef<VideoView>(null);
    useEffect(() => {
        const lockLandscape = async () => {
            await ScreenOrientation.lockAsync(
                ScreenOrientation.OrientationLock.LANDSCAPE
            );
        };
        lockLandscape();

        return () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, []);


    const player = useVideoPlayer(videoUrl, (player) => {
        player.loop = true;
        videoRef.current?.enterFullscreen();
        if (autoPlay) {
            player.play();
        }        
    });

    useEvent(player, "playingChange", {
        isPlaying: player.playing,
    });

    return (
        <View style={styles.contentContainer}>
            <VideoView
                style={styles.video}
                ref={videoRef}
                allowsFullscreen
                allowsPictureInPicture
                allowsVideoFrameAnalysis
                nativeControls
                showsTimecodes
                player={player} />
        </View>
    );
};

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
    },
    video: {
        flex: 1,
    },
});
