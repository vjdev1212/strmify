import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { useVideoPlayer, VideoSource, VideoView } from 'expo-video';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from '@/components/Themed';
import * as ScreenOrientation from 'expo-screen-orientation';

const VideoPlayer = () => {
    const { videoUrl, title, artwork } = useLocalSearchParams();
    const router = useRouter();
    const videoSource: VideoSource = {
        uri: videoUrl as string,
        metadata: {
            title: title as string,
            artwork: artwork as string
        }
    };
    
    const player = useVideoPlayer(videoSource, player => {
        player.loop = true;
        player.allowsExternalPlayback = true;
        player.showNowPlayingNotification = true;
        player.staysActiveInBackground = true;
        player.play();
    });

    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);

        return () => {
            ScreenOrientation.unlockAsync();
        };
    }, []);

    const { width } = Dimensions.get('window');

    return (
        <View style={styles.container}>
            <VideoView
                player={player}
                style={{
                    width: '100%',
                    height: (width * 9) / 16,
                }}
                allowsFullscreen
                allowsPictureInPicture
                allowsVideoFrameAnalysis
                contentFit="contain"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
});

export default VideoPlayer;
