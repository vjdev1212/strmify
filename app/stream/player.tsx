import OpenSubtitlesClient, { SubtitleResult } from "@/clients/opensubtitles";
import { isUserAuthenticated, scrobbleStart, scrobbleStop } from "@/clients/trakt";
import { Subtitle } from "@/components/coreplayer/models";
import { getLanguageName } from "@/utils/Helpers";
import { StorageKeys, storageService } from "@/utils/StorageService";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
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
  progress: number;
  player: "native" | "vlc",
}

interface UpdateProgressEvent {
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

const MediaPlayerScreen: React.FC = () => {
  const router = useRouter();
  const { videoUrl, title, imdbid, type, season, episode, progress: watchHistoryProgress } = useLocalSearchParams();
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(true);
  const [openSubtitlesClient, setOpenSubtitlesClient] = useState<OpenSubtitlesClient | null>(null);
  const [progress, setProgress] = useState(watchHistoryProgress || 0);
  const artwork = `https://images.metahub.space/background/medium/${imdbid}/img`;

  // Trakt scrobbling state
  const [isTraktAuthenticated, setIsTraktAuthenticated] = useState(false);
  const [hasStartedScrobble, setHasStartedScrobble] = useState(false);
  const lastScrobbleProgressRef = useRef<number>(0);

  useEffect(() => {
    initializeClient();
    checkTraktAuth();
  }, []);

  useEffect(() => {
    if (openSubtitlesClient) {
      fetchSubtitles();
    }
  }, [imdbid, type, season, episode, openSubtitlesClient]);

  const checkTraktAuth = async () => {
    const isAuth = await isUserAuthenticated();
    setIsTraktAuthenticated(isAuth);
  };

  const initializeClient = async () => {
    try {
      const client = new OpenSubtitlesClient();
      setOpenSubtitlesClient(client);
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

  const syncProgressToTrakt = async (progressPercentage: number) => {
    if (!isTraktAuthenticated || !imdbid) {
      return;
    }

    try {
      // Start scrobble when playback begins (at ~3% progress to avoid false starts)
      if (!hasStartedScrobble && progressPercentage >= 3) {
        const scrobbleData: any = {
          progress: progressPercentage,
        };

        if (type === 'series' && season && episode) {
          scrobbleData.episode = {
            ids: {
              imdb: imdbid
            }
          };
          // Add season and episode numbers if available
          if (season) scrobbleData.show = { ids: { imdb: imdbid } };
        } else {
          scrobbleData.movie = {
            ids: {
              imdb: imdbid
            }
          };
        }

        const success = await scrobbleStart(scrobbleData);
        if (success) {
          console.log('Trakt scrobble started at', progressPercentage, '%');
          setHasStartedScrobble(true);
          lastScrobbleProgressRef.current = progressPercentage;
        }
      }
      // Update progress at key milestones: every 15% OR when reaching 80%+
      // This balances accuracy with API efficiency
      else if (hasStartedScrobble) {
        const progressDiff = progressPercentage - lastScrobbleProgressRef.current;

        // Update at 15% intervals (15, 30, 45, 60, 75) OR when near completion (80%+)
        const shouldUpdate = progressDiff >= 15 ||
          (progressPercentage >= 80 && progressDiff >= 5);

        if (shouldUpdate) {
          const scrobbleData: any = {
            progress: progressPercentage,
          };

          if (type === 'series' && season && episode) {
            scrobbleData.episode = {
              ids: {
                imdb: imdbid
              }
            };
          } else {
            scrobbleData.movie = {
              ids: {
                imdb: imdbid
              }
            };
          }

          const success = await scrobbleStart(scrobbleData);
          if (success) {
            console.log('Trakt progress updated to', progressPercentage, '%');
            lastScrobbleProgressRef.current = progressPercentage;
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync progress to Trakt:', error);
    }
  };

  const stopTraktScrobble = async (finalProgress: number) => {
    // Only stop if authenticated, has valid imdbid, and progress > 3%
    // We check progress instead of hasStartedScrobble to handle race conditions
    if (!isTraktAuthenticated || !imdbid || finalProgress < 1) {
      console.log('Skipping Trakt stop - conditions not met:', {
        isTraktAuthenticated,
        hasImdbid: !!imdbid,
        finalProgress
      });
      return;
    }

    try {

      await saveToWatchHistory(finalProgress);

      const scrobbleData: any = {
        progress: finalProgress,
      };

      if (type === 'series' && season && episode) {
        scrobbleData.episode = {
          ids: {
            imdb: imdbid
          }
        };
      } else {
        scrobbleData.movie = {
          ids: {
            imdb: imdbid
          }
        };
      }

      console.log('Stopping Trakt scrobble with data:', scrobbleData);
      const success = await scrobbleStop(scrobbleData);
      if (success) {
        console.log('Trakt scrobble stopped at', finalProgress, '%');
        setHasStartedScrobble(false); // Reset the flag
      }
    } catch (error) {
      console.error('Failed to stop Trakt scrobble:', error);
    }
  };

  const handleBack = async (event: BackEvent): Promise<void> => {
    // Stop scrobble when user exits
    await stopTraktScrobble(Math.floor(event.progress));
    router.back();
  };

  const handleUpdateProgress = async (event: UpdateProgressEvent): Promise<void> => {
    if (event.progress <= 1)
      return;

    const progressPercentage = Math.floor(event.progress);
    setProgress(progressPercentage);
    console.log('UpdateProgress', event);

    // Save to local watch history
    await saveToWatchHistory(progressPercentage);

    // Sync to Trakt
    await syncProgressToTrakt(progressPercentage);
  };

  function getPlayer() {
    if (Platform.OS === "web") {
      return require("../../components/nativeplayer").MediaPlayer;
    }
    return require("../../components/vlcplayer").MediaPlayer;
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
      updateProgress={handleUpdateProgress}
    />
  );
};

export default MediaPlayerScreen;