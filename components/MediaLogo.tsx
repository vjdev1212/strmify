import React, { useState, useEffect } from 'react';
import { Animated, StyleSheet, useWindowDimensions, Image, Text, View } from 'react-native';

const MediaLogo = ({ logo, title }: { logo: string, title: string }) => {
    const [titleFadeAnim] = useState(new Animated.Value(0));
    const [logoError, setLogoError] = useState(false);

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
            style={[styles.logoContainer, {
                opacity: titleFadeAnim,
                marginTop: isPortrait ? 10 : 0,
                alignSelf: isPortrait ? 'center' : 'auto'
            }]}
        >
            {!logoError ? (
                <Image
                    resizeMode="contain"
                    source={{ uri: logo }}
                    style={[styles.logo, {
                        width: isPortrait ? 120 : null,
                        height: isPortrait ? null : 100,
                    }]}
                    onError={() => setLogoError(true)}
                />
            ) : (
                <View style={styles.titleContainer}>
                    <Text style={[styles.titleText,
                    {
                        fontSize: isPortrait ? 25 : 35
                    }]} ellipsizeMode="tail">{title}</Text>
                </View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    logoContainer: {
        alignItems: 'center',
    },
    logo: {
        aspectRatio: 21 / 9,
    },
    titleContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 5,
        padding: 10,
    },
    titleText: {
        color: '#ffffff',
        fontWeight: 'bold',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'center',
        paddingHorizontal: 10,
    },
});

export default MediaLogo;