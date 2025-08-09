import MediaPlayer, { Chapter, Subtitle } from "@/components/MediaPlayer";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

const MediaPlayerScreen: React.FC = () => {
  const router = useRouter();
  const { videoUrl, title, artwork } = useLocalSearchParams();
  const exampleSubtitles: Subtitle[] = [];

  const exampleChapters: Chapter[] = [];

  const handleBack = (): void => {
    router.back();
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