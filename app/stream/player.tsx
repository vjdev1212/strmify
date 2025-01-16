import React, { useEffect, useState } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useLocalSearchParams } from 'expo-router';
import { View } from '@/components/Themed';
import * as ScreenOrientation from 'expo-screen-orientation';

const VideoPlayer = () => {
    const { videoUrl } = useLocalSearchParams();
    const [orientation, setOrientation] = useState('portrait');
    const player = useVideoPlayer(videoUrl as string, player => {
        player.loop = true;
        player.allowsExternalPlayback = true;
        player.play();
    });

    useEffect(() => {
        const lockOrientation = async () => {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        };

        const updateOrientation = () => {
            const { width, height } = Dimensions.get('window');
            setOrientation(width > height ? 'landscape' : 'portrait');
        };

        lockOrientation();

        const subscription = Dimensions.addEventListener('change', updateOrientation);
        updateOrientation();

        return () => {
            subscription?.remove();
            ScreenOrientation.unlockAsync(); 
        };
    }, []);

    const { width, height } = Dimensions.get('window');

    return (
        <View style={styles.container}>
            <VideoView
                player={player}
                style={{
                    width: orientation === 'landscape' ? Math.max(width, height) : width,
                    height: orientation === 'landscape' ? height : (width * 9) / 16,
                }}
                allowsFullscreen
                allowsPictureInPicture
                allowsVideoFrameAnalysis
                contentFit={'contain'}
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
