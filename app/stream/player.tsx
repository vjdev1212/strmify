import { Subtitle, Chapter, MediaPlayer } from "@/components/MediaPlayer";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Platform } from "react-native";

const MediaPlayerScreen: React.FC = () => {
  const router = useRouter();
  const { videoUrl, title, artwork } = useLocalSearchParams();
  const subtitles: Subtitle[] = [];
  const chapters: Chapter[] = [];

  const handleBack = (): void => {
    router.back();
  };

  const Player =
    Platform.OS === "web"
      ? require("../../components/MediaPlayer").MediaPlayer
      : require("../../components/NativeMediaPlayer").NativeMediaPlayer


  return (
    <Player
      videoUrl={videoUrl as string}
      title={title as string}
      subtitle={title as string}
      subtitles={subtitles}
      chapters={chapters}
      onBack={handleBack}
      autoPlay={true}
      artwork={artwork as string}
    />
  );
};

export default MediaPlayerScreen;