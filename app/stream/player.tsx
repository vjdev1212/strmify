import OpenSubtitlesClient, { SubtitleResult } from "@/clients/opensubtitles";
import { Subtitle } from "@/components/nativeplayer/models";
import { getLanguageName } from "@/utils/Helpers";
import { StorageKeys, storageService } from "@/utils/StorageService";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";

interface PlayerSwitchEvent {
  message: string;
  code?: string;
  player: "native" | "vlc",
  progress: number;
}

interface BackEvent {
  message: string;
  code?: string;
  player: "native" | "vlc",
}

interface UpdateProgessEvent {
  progress: number
}

interface WatchHistoryItem {
  title: string;
  videoUrl: string;
  imdbid: string;
  type: string;
  season: string;
  episode: string;
  useVlcKit: string;
  progress: number;
  artwork: string;
  timestamp: number;
}

const WATCH_HISTORY_KEY = StorageKeys.WATCH_HISTORY_KEY;
const MAX_HISTORY_ITEMS = 30;

const MediaPlayerScreen: React.FC = () => {
  const router = useRouter();
  const { videoUrl, title, imdbid, type, season, episode, useVlcKit } = useLocalSearchParams();
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(true);
  const [openSubtitlesClient, setOpenSubtitlesClient] = useState<OpenSubtitlesClient | null>(null);
  const [forceVlc, setForceVlc] = useState(false);
  const [progress, setProgress] = useState(0);
  const artwork = `https://images.metahub.space/background/medium/${imdbid}/img`;

  useEffect(() => {
    initializeClient();
  }, []);

  useEffect(() => {
    if (openSubtitlesClient) {
      fetchSubtitles();
    }
  }, [imdbid, type, season, episode, openSubtitlesClient]);

  const initializeClient = async () => {
    try {
      const userAgent = await storageService.getItem(StorageKeys.OPENSUBTITLES_USER_AGENT) || 'Strmify';
      const apiKey = await storageService.getItem(StorageKeys.OPENSUBTITLES_API_KEY) || '';

      if (apiKey && apiKey.trim() !== '') {
        const client = new OpenSubtitlesClient(userAgent, apiKey);
        setOpenSubtitlesClient(client);
      } else {
        console.log('No API key provided, subtitles will not be loaded');
        setOpenSubtitlesClient(null);
        setSubtitles([]);
        setIsLoadingSubtitles(false);
      }
    } catch (error) {
      console.error('Failed to initialize OpenSubtitles client:', error);
      setOpenSubtitlesClient(null);
      setSubtitles([]);
      setIsLoadingSubtitles(false);
    }
  };

  const fetchSubtitles = async () => {
    if (!imdbid || !openSubtitlesClient) {
      setIsLoadingSubtitles(false);
      return;
    }

    try {
      setIsLoadingSubtitles(true);

      let response;
      if (type === 'series' && season && episode) {
        response = await openSubtitlesClient.searchTVSubtitles(
          imdbid as string,
          parseInt(season as string),
          parseInt(episode as string),
          'episode',
          ['en'],
          {
            format: 'srt',
            ai_translated: 'include',
            machine_translated: 'include',
            trusted_sources: 'include',
            hearing_impaired: 'include'
          }
        );
      } else {
        // For movies
        response = await openSubtitlesClient.searchMovieSubtitles(
          imdbid as string,
          'movie',
          ['en'],
          {
            format: 'srt',
            ai_translated: 'include',
            machine_translated: 'include',
            trusted_sources: 'include',
            hearing_impaired: 'include'
          }
        );
      }

      if (response.success) {
        if (response.data.length === 0) {
          setSubtitles([]);
          setIsLoadingSubtitles(false);
          return;
        }
        const sortedData = response.data.sort((a, b) => b.download_count - a.download_count);

        const transformedSubtitles: Subtitle[] = sortedData.map((subtitle: SubtitleResult) => ({
          fileId: subtitle.file_id,
          language: subtitle.language,
          url: subtitle.url,
          label: `${getLanguageName(subtitle.language)} - ${subtitle.name}`
        }));

        setSubtitles(transformedSubtitles);
      } else {
        console.error('Failed to fetch subtitles:', response.error);

        if (response.error.includes('You cannot consume this service')) {
          console.error('Authentication issue: Please check your API key or registration status');
        }

        setSubtitles([]);
      }
    } catch (error) {
      console.error('Error fetching subtitles:', error);
      setSubtitles([]);
    } finally {
      setIsLoadingSubtitles(false);
    }
  };

  const saveToWatchHistory = async () => {
    const minProgressAsWatched = 95;

    try {
      const existingHistoryJson = await storageService.getItem(WATCH_HISTORY_KEY);
      let history: WatchHistoryItem[] = existingHistoryJson ? JSON.parse(existingHistoryJson) : [];

      // Remove if progress >= minProgressAsWatched%
      if (progress >= minProgressAsWatched) {
        history = history.filter(item =>
          !(item.imdbid === imdbid &&
            item.type === type &&
            item.season === season &&
            item.episode === episode)
        );
        await storageService.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
        console.log('Removed from watch history (watched ≥ 90%)');
        return;
      }

      // Otherwise, add/update as usual
      const historyItem: WatchHistoryItem = {
        title: title as string,
        videoUrl: videoUrl as string,
        progress: progress,
        artwork: artwork,
        imdbid: imdbid as string,
        type: type as string,
        season: season as string,
        episode: episode as string,
        useVlcKit: forceVlc ? 'true' : (useVlcKit as string || 'false'),
        timestamp: Date.now()
      };

      console.log('Saving to watch history:', historyItem);

      const existingIndex = history.findIndex(item =>
        item.imdbid === imdbid &&
        item.type === type &&
        item.season === season &&
        item.episode === episode
      );

      if (existingIndex !== -1) {
        history[existingIndex] = {
          ...history[existingIndex],
          videoUrl: videoUrl as string,
          progress: progress,
          timestamp: Date.now()
        };

        const [updatedItem] = history.splice(existingIndex, 1);
        history.unshift(updatedItem);
      } else {
        history.unshift(historyItem);
      }

      if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
      }

      await storageService.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
      console.log('Watch history saved successfully');
    } catch (error) {
      console.error('Failed to save watch history:', error);
    }
  };


  const handleBack = async (event: BackEvent): Promise<void> => {
    console.log('BackEvent', event);
    await saveToWatchHistory();
    router.back();
  };

  const handleUpdateProgress = async (event: UpdateProgessEvent): Promise<void> => {
    console.log('UpdateProgress', event);
    await saveToWatchHistory();
    setProgress(event.progress);
  };

  const handleSwitchMediaPlayer = (event: PlayerSwitchEvent): void => {
    console.log(`Video playback failed (${event.player}):`, event.message);

    // Only switch players if not on web
    if (Platform.OS === "web") return;

    setProgress(event.progress);
    if (event.player === "native" && !forceVlc && useVlcKit !== 'true') {
      console.log("Switching to VLC player...");
      setForceVlc(true);
    } else if (event.player === "vlc") {
      console.log("VLC player failed. Switching back to native player...");
      setForceVlc(false);
    }
  };

  function getPlayer() {
    if (Platform.OS === "web") {
      return require("../../components/nativeplayer").MediaPlayer;
    }
    if (useVlcKit === 'true' || forceVlc) {
      return require("../../components/vlcplayer").MediaPlayer;
    }
    return require("../../components/nativeplayer").MediaPlayer;
  }

  const Player = getPlayer();

  return (
    <Player
      videoUrl={videoUrl as string}
      title={title as string}
      back={handleBack}
      progress={progress}
      artwork={artwork as string}
      subtitles={subtitles}
      openSubtitlesClient={openSubtitlesClient}
      isLoadingSubtitles={isLoadingSubtitles}
      switchMediaPlayer={handleSwitchMediaPlayer}
      updateProgress={handleUpdateProgress}
    />
  );
};

export default MediaPlayerScreen;