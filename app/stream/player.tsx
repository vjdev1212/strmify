import { Subtitle, Chapter, MediaPlayer } from "@/components/MediaPlayer";
import { useLocalSearchParams } from "expo-router";
import React from "react";

const MediaPlayerScreen: React.FC = () => {
  const { videoUrl, title, artwork } = useLocalSearchParams();
  const exampleSubtitles: Subtitle[] = [];

  const exampleChapters: Chapter[] = [];

  const handleBack = (): void => {
    console.log('Back pressed');
  };

  return (
    <MediaPlayer
      videoUrl={videoUrl as string}
      title={title as string}
      subtitle={title as string}
      subtitles={exampleSubtitles}
      chapters={exampleChapters}
      onBack={handleBack}
      autoPlay={true}
    />
  );
};

export default MediaPlayerScreen;