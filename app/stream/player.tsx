import OpenSubtitlesClient, { SubtitleResult } from "@/clients/opensubtitles";
import { Subtitle } from "@/components/coreplayer/models";
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
  progress: number;
  artwork: string;
  timestamp: number;
}

const WATCH_HISTORY_KEY = StorageKeys.WATCH_HISTORY_KEY;
const MAX_HISTORY_ITEMS = 30;

// Native player supported MIME types and extensions
const NATIVE_SUPPORTED_FORMATS = {
  mimeTypes: [
    'video/mp4',
    'video/x-m4v',
    'video/quicktime',
    'video/3gpp',
    'video/3gpp2',
    'audio/x-m4a',
    'video/webm',
    'video/mp2t', // MPEG-TS
  ],
  extensions: [
    '.mp4', '.m4v', '.mov', '.m4a', '.3gp', '.3g2', '.webm', '.ts'
  ]
};

const MediaPlayerScreen: React.FC = () => {
  const router = useRouter();
  const { videoUrl, title, imdbid, type, season, episode, progress: watchHistoryProgress } = useLocalSearchParams();
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(true);
  const [openSubtitlesClient, setOpenSubtitlesClient] = useState<OpenSubtitlesClient | null>(null);
  const [progress, setProgress] = useState(watchHistoryProgress || 0);
  const [useVlc, setUseVlc] = useState(false);
  const [isDetectingFormat, setIsDetectingFormat] = useState(true);
  const artwork = `https://images.metahub.space/background/medium/${imdbid}/img`;

  useEffect(() => {
    initializeClient();
    detectVideoFormat();
  }, []);

  useEffect(() => {
    if (openSubtitlesClient) {
      fetchSubtitles();
    }
  }, [imdbid, type, season, episode, openSubtitlesClient]);

  const detectVideoFormat = async () => {
    if (Platform.OS === "web") {
      setUseVlc(false);
      setIsDetectingFormat(false);
      return;
    }

    const url = videoUrl as string;
    
    try {
      // First, check file extension from URL
      const extensionMatch = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
      if (extensionMatch) {
        const extension = `.${extensionMatch[1].toLowerCase()}`;
        const isSupported = NATIVE_SUPPORTED_FORMATS.extensions.includes(extension);
        console.log(`Detected extension: ${extension}, Native supported: ${isSupported}`);
        
        if (isSupported) {
          setUseVlc(false);
          setIsDetectingFormat(false);
          return;
        }
        
        // If we found an extension and it's not supported, use VLC
        if (!['.m3u8', '.mpd'].includes(extension)) { // Skip HEAD for streaming formats
          setUseVlc(true);
          setIsDetectingFormat(false);
          return;
        }
      }

      // No extension or streaming format detected, try HEAD request
      console.log('Performing HEAD request to detect content type...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type')?.toLowerCase() || '';
        console.log(`Content-Type detected: ${contentType}`);

        // Check if content type is supported by native player
        const isSupported = NATIVE_SUPPORTED_FORMATS.mimeTypes.some(mime => 
          contentType.includes(mime)
        );

        // Special handling for streaming formats
        if (contentType.includes('application/vnd.apple.mpegurl') || // HLS
            contentType.includes('application/dash+xml') ||           // DASH
            contentType.includes('application/x-mpegurl')) {          // HLS alternative
          console.log('Streaming format detected, using native player');
          setUseVlc(false);
          setIsDetectingFormat(false);
          return;
        }

        console.log(`Native player support: ${isSupported}`);
        setUseVlc(!isSupported);
        setIsDetectingFormat(false);

      } catch (headError) {
        clearTimeout(timeoutId);
        console.warn('HEAD request failed, defaulting to native player:', headError);
        // If HEAD request fails, default to native player and let it fail gracefully
        setUseVlc(false);
        setIsDetectingFormat(false);
      }

    } catch (error) {
      console.error('Error detecting video format:', error);
      // On error, default to native player
      setUseVlc(false);
      setIsDetectingFormat(false);
    }
  };

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

  const saveToWatchHistory = async (progress: number) => {
    const minProgressAsWatched = 95;

    try {
      const existingHistoryJson = await storageService.getItem(WATCH_HISTORY_KEY);
      let history: WatchHistoryItem[] = existingHistoryJson ? JSON.parse(existingHistoryJson) : [];

      if (progress >= minProgressAsWatched) {
        history = history.filter(item =>
          !(item.imdbid === imdbid &&
            item.type === type &&
            item.season === season &&
            item.episode === episode)
        );
        await storageService.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
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
    router.back();
  };

  const handleUpdateProgress = async (event: UpdateProgessEvent): Promise<void> => {
    if (event.progress <= 1)
      return;
    setProgress(Math.floor(event.progress));
    console.log('UpdateProgress', event);
    await saveToWatchHistory(Math.floor(event.progress));
  };

  const handlePlayerSwitch = (event: PlayerSwitchEvent): void => {
    console.log('Manual player switch requested:', event);
    setUseVlc(event.player === 'vlc');
    setProgress(event.progress);
  };

  function getPlayer() {
    if (Platform.OS === "web") {
      return require("../../components/nativeplayer").MediaPlayer;
    }
    
    // Wait for format detection to complete
    if (isDetectingFormat) {
      return null; // Or return a loading component
    }
    
    // On mobile, use player based on detected format
    if (useVlc) {
      console.log('Loading VLC player');
      return require("../../components/vlcplayer").MediaPlayer;
    }
    
    console.log('Loading Native player');
    return require("../../components/nativeplayer").MediaPlayer;
  }

  const Player = getPlayer();

  // Show loading state while detecting format
  if (isDetectingFormat && Platform.OS !== "web") {
    return null; // You can return a loading component here
  }

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
      updateProgress={handleUpdateProgress}
      onPlayerSwitch={handlePlayerSwitch}
    />
  );
};

export default MediaPlayerScreen;