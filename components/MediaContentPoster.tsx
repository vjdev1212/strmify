import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View as RNView, Animated, ActivityIndicator } from 'react-native';
import { View } from './Themed';
import { WebView } from 'react-native-webview';

interface MediaContentPosterProps {
  background: string;
  isPortrait: boolean;
  trailerKey?: string | null;
}

const MediaContentPoster: React.FC<MediaContentPosterProps> = ({ 
  background, 
  isPortrait, 
  trailerKey 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const videoFadeAnim = useRef(new Animated.Value(0)).current;
  const DELAY_BEFORE_VIDEO = 5000; // 5 seconds

  useEffect(() => {
    if (trailerKey && !isLoading) {
      const timer = setTimeout(() => {
        // Fade out poster
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowVideo(true);
          // Fade in video
          Animated.timing(videoFadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        });
      }, DELAY_BEFORE_VIDEO);

      return () => clearTimeout(timer);
    }
  }, [trailerKey, isLoading, fadeAnim, videoFadeAnim]);

  const startAnimations = useCallback(() => {
    setIsLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const   containerStyle = [
    styles.posterContainer,
    { aspectRatio: isPortrait ? 1 / 1 : 16 / 9 }
  ];

  const posterStyle = [
    styles.poster,
    {
      opacity: fadeAnim,
      borderRadius: isPortrait ? 0 : 10,
    }
  ];

  const videoStyle = [
    styles.video,
    {
      opacity: videoFadeAnim,
      borderRadius: isPortrait ? 0 : 10,
    }
  ];

  return (
    <View style={containerStyle}>
      {isLoading && (
        <RNView style={styles.loaderContainer}>
          <ActivityIndicator color="#535aff" />
        </RNView>
      )}

      {!showVideo && (
        <Animated.Image
          resizeMode="cover"
          source={{ uri: background }}
          style={posterStyle}
          onLoad={startAnimations}
        />
      )}

      {showVideo && trailerKey && (
        <Animated.View style={videoStyle}>
          <WebView
            source={{ 
              uri: `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&loop=1&playlist=${trailerKey}&controls=0&modestbranding=1&rel=0&playsinline=1`
            }}
            style={styles.webview}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            scrollEnabled={false}
            scalesPageToFit={true}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  posterContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    objectFit: 'cover'
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});

export default MediaContentPoster;