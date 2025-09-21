import { Subtitle, Chapter, MediaPlayer } from "@/components/MediaPlayer";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Platform } from "react-native";

const MediaPlayerScreen: React.FC = () => {
  const router = useRouter();
  const { videoUrl, title, imdbid, type, season, episode } = useLocalSearchParams();
  const subtitles: Subtitle[] = [];
  const chapters: Chapter[] = [];
  const artwork = `https://images.metahub.space/background/medium/${imdbid}/img`;

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
      onBack={handleBack}
      artwork={artwork as string}
    />
  );
};

export default MediaPlayerScreen;