import React, { useState, useEffect } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';

const MediaLogo = ({ logo }: { logo: string }) => {
    const [titleFadeAnim] = useState(new Animated.Value(0));
    
    const { width, height } = useWindowDimensions();
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
            style={[styles.logoContainer, { opacity: titleFadeAnim, alignSelf: isPortrait ? 'center' : 'auto' }]}
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
        marginTop: 10,
        alignItems: 'center',
    },
    logo: {
        aspectRatio: 16 / 9
    },
});

export default MediaLogo;
