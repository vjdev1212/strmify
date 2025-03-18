import React, { useState, useEffect } from 'react';
import { StyleSheet, Dimensions, ScaledSize } from 'react-native';
import { useVideoPlayer, VideoSource, VideoView } from 'expo-video';
import { useLocalSearchParams } from 'expo-router';
import { View } from '@/components/Themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { isOrientationSupported } from '@/utils/platform';


const VideoPlayer = () => {
    const { videoUrl, title, artwork } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const [screenDimensions, setScreenDimensions] = useState<ScaledSize>(Dimensions.get('window'));
    const [isLandscape, setIsLandscape] = useState(screenDimensions.width > screenDimensions.height);

    const videoSource: VideoSource = {
        uri: videoUrl as string,
        metadata: {
            title: title as string,
            artwork: artwork as string,
        },
    };

    const player = useVideoPlayer(videoSource, player => {
        player.loop = true;
        player.allowsExternalPlayback = true;
        player.showNowPlayingNotification = true;
        player.staysActiveInBackground = true;
        player.play();
    });

    useEffect(() => {
        const handleDimensionsChange = ({ window }: { window: ScaledSize }) => {
            setScreenDimensions(window);
            setIsLandscape(window.width > window.height);
        };

        const subscription = Dimensions.addEventListener('change', handleDimensionsChange);

        if (isOrientationSupported()) {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
        }

        return () => {
            subscription?.remove();
            if (isOrientationSupported()) {
                ScreenOrientation.unlockAsync();
            }
        };
    }, []);

    const videoHeight = isLandscape
        ? screenDimensions.height - insets.bottom
        : (screenDimensions.width * 9) / 16;

    return (
                <View style={styles.container}>
                <VideoView
                    player={player}
                    style={{
                        width: screenDimensions.width,
                        height: videoHeight,
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
