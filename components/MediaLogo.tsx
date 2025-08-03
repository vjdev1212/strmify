import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Animated, StyleSheet, useWindowDimensions, Image } from 'react-native';
import { Text, View } from './Themed';

// Type definitions
interface MediaLogoProps {
  logo: string;
  title: string;
}

// Constants
const LOGO_TEXT_COLOR = '#ffffff';
const ANIMATION_DURATION = 500;
const PORTRAIT_LOGO_WIDTH = 120;
const LANDSCAPE_LOGO_HEIGHT = 100;
const PORTRAIT_FONT_SIZE = 25;
const LANDSCAPE_FONT_SIZE = 35;
const LOGO_ASPECT_RATIO = 16 / 9;

const MediaLogo: React.FC<MediaLogoProps> = ({ logo, title }) => {
  const [titleFadeAnim] = useState(() => new Animated.Value(0));
  const [logoError, setLogoError] = useState(false);
  const { width, height } = useWindowDimensions();

  // Memoized computed values
  const computedValues = useMemo(() => {
    const isPortrait = height > width;
    const fontSize = isPortrait ? PORTRAIT_FONT_SIZE : LANDSCAPE_FONT_SIZE;
    const logoWidth = isPortrait ? PORTRAIT_LOGO_WIDTH : null;
    const logoHeight = isPortrait ? null : LANDSCAPE_LOGO_HEIGHT;
    const alignSelf = isPortrait ? 'center' : 'auto';

    return {
      isPortrait,
      fontSize,
      logoWidth,
      logoHeight,
      alignSelf,
    };
  }, [height, width]);

  // Memoized styles
  const animatedContainerStyle = useMemo(() => ({
    ...styles.logoContainer,
    opacity: titleFadeAnim,
    alignSelf: computedValues.alignSelf as 'center' | 'auto',
  }), [titleFadeAnim, computedValues.alignSelf]);

  const logoStyle = useMemo(() => ({
    ...styles.logo,
    width: computedValues.logoWidth,
    height: computedValues.logoHeight,
  }), [computedValues.logoWidth, computedValues.logoHeight]);

  const titleTextStyle = useMemo(() => ({
    ...styles.titleText,
    color: LOGO_TEXT_COLOR,
    fontSize: computedValues.fontSize,
  }), [computedValues.fontSize]);

  // Memoized callbacks
  const handleLogoError = useCallback(() => {
    setLogoError(true);
  }, []);

  // Animation effect
  useEffect(() => {
    const animation = Animated.timing(titleFadeAnim, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    });

    animation.start();

    // Cleanup function to stop animation if component unmounts
    return () => {
      animation.stop();
    };
  }, [titleFadeAnim]);

  // Reset logo error when logo prop changes
  useEffect(() => {
    setLogoError(false);
  }, [logo]);

  // Early return if no logo and no title
  if (!logo && !title) {
    return null;
  }

  return (
    <Animated.View style={animatedContainerStyle}>
      {!logoError && logo ? (
        <Image
          resizeMode="contain"
          source={{ uri: logo }}
          style={logoStyle}
          onError={handleLogoError}
        />
      ) : (
        <View style={styles.titleContainer}>
          <Text style={titleTextStyle} ellipsizeMode="tail">
            {title}
          </Text>
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
    aspectRatio: LOGO_ASPECT_RATIO,
  },
  titleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    padding: 10,
  },
  titleText: {
    fontWeight: '500',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});

export default MediaLogo;