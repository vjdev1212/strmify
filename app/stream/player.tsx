import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Dimensions } from "react-native";
import { VLCPlayer } from "react-native-vlc-media-player";

const MediaPlayerScreen: React.FC = () => {
  const router = useRouter();
  const { videoUrl, title, artwork } = useLocalSearchParams();

  const handleBack = (): void => {
    router.back();
  };

  const calcVLCPlayerHeight = (windowWidth: any, aspetRatio: any) => {
    return windowWidth * aspetRatio;
  };

  return (
    <VLCPlayer
      source={{
        initType: 2,
        uri:
          'rtsp://stream.com',
        initOptions: [
          '--no-audio',
          '--rtsp-tcp',
          '--network-caching=150',
          '--rtsp-caching=150',
          '--no-stats',
          '--tcp-caching=150',
          '--realrtsp-caching=150',
        ],
      }}
      autoplay={true}
      autoAspectRatio={true}
      resizeMode="cover"
      style={{ height: calcVLCPlayerHeight(Dimensions.get('window').width, 3 / 4), marginTop: 30 }}
    />
  );
};

export default MediaPlayerScreen;