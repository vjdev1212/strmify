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
            style={[styles.logoContainer, { opacity: titleFadeAnim, alignSelf: isPortrait ? 'center' : 'auto' }]}
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
                    <Text style={styles.titleText}>{title}</Text>
                </View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    logoContainer: {
        marginTop: 10,
        alignItems: 'center',
    },
    logo: {
        aspectRatio: 16 / 9,
    },
    titleContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        borderRadius: 5,
    },
    titleText: {
        color: '#ffffff',
        fontSize: 30,
        fontWeight: 'bold'
    },
});

export default MediaLogo;