import React, { useState, useEffect } from 'react';
import { Animated, StyleSheet, Platform, Dimensions } from 'react-native';

const MediaLogo = ({ logo }: { logo: string }) => {
    const [titleFadeAnim] = useState(new Animated.Value(0));
    const isWeb = Platform.OS === 'web';
    const { width, height } = Dimensions.get('window');
    const isPortrait = height > width;

    useEffect(() => {
        Animated.timing(titleFadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [titleFadeAnim]);

    return (
        <Animated.View
            style={[styles.logoContainer, { opacity: titleFadeAnim, alignSelf: isWeb ? 'center' : 'auto' }]}
        >
            <Animated.Image resizeMode="contain" source={{ uri: logo }} style={[styles.logo, {
                width: isPortrait ? 120 : null,
                height: isPortrait ? null : 100,
            }]} />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    logoContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    logo: {
        aspectRatio: 16 / 9
    },
});

export default MediaLogo;
