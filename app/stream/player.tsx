import OpenSubtitlesClient, { SubtitleResult } from "@/clients/opensubtitles";
import { isUserAuthenticated, scrobbleStart, scrobbleStop } from "@/clients/trakt";
import { generateStremioPlayerUrl } from "@/clients/stremio";
import { Subtitle } from "@/components/coreplayer/models";
import { getLanguageName } from "@/utils/Helpers";
import { StorageKeys, storageService } from "@/utils/StorageService";
import { getPlatformSpecificPlayers } from "@/utils/MediaPlayer";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import { Platform, ActivityIndicator, View, Text, StyleSheet, Pressable } from "react-native";
import { ServerConfig } from "@/components/ServerConfig";

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

interface Stream {
  name: string;
  title?: string;
  url?: string;
  embed?: string;
  infoHash?: string;
  magnet?: string;
  magnetLink?: string;
  description?: string;
}

const WATCH_HISTORY_KEY = StorageKeys.WATCH_HISTORY_KEY;
const MAX_HISTORY_ITEMS = 30;
const DEFAULT_STREMIO_URL = 'http://192.168.1.10:11470';
const DEFAULT_MEDIA_PLAYER_KEY = StorageKeys.DEFAULT_MEDIA_PLAYER_KEY;
const SERVERS_KEY = StorageKeys.SERVERS_KEY;

const MediaPlayerScreen: React.FC = () => {
  const router = useRouter();
  const {
    streams: streamsParam,
    selectedStreamIndex,
    title,
    imdbid,
    type,
    season,
    episode,
    progress: watchHistoryProgress
  } = useLocalSearchParams();

  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(true);
  const [openSubtitlesClient, setOpenSubtitlesClient] = useState<OpenSubtitlesClient | null>(null);
  const [progress, setProgress] = useState(watchHistoryProgress || 0);
  const artwork = `https://images.metahub.space/background/medium/${imdbid}/img`;

  // Stream handling state
  const [streams, setStreams] = useState<Stream[]>([]);
  const [currentStreamIndex, setCurrentStreamIndex] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(true);
  const [streamError, setStreamError] = useState<string>('');
  const [stremioServers, setStremioServers] = useState<ServerConfig[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ name: string; scheme: string; encodeUrl: boolean }[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Trakt scrobbling state
  const [isTraktAuthenticated, setIsTraktAuthenticated] = useState(false);
  const [hasStartedScrobble, setHasStartedScrobble] = useState(false);
  const lastScrobbleProgressRef = useRef<number>(0);

  useEffect(() => {
    // Parse streams from params
    if (streamsParam) {
      try {
        const parsedStreams = JSON.parse(streamsParam as string);
        setStreams(parsedStreams);

        const initialIndex = selectedStreamIndex ? parseInt(selectedStreamIndex as string) : 0;
        setCurrentStreamIndex(initialIndex);
      } catch (error) {
        console.error('Failed to parse streams:', error);
        setStreamError('Failed to load streams');
      }
    }

    initializeClient();
    checkTraktAuth();
    initializePlayer();
  }, []);

  useEffect(() => {
    if (openSubtitlesClient) {
      fetchSubtitles();
    }
  }, [imdbid, type, season, episode, openSubtitlesClient]);

  useEffect(() => {
    if (streams.length > 0 && stremioServers.length > 0) {
      loadStream(currentStreamIndex);
    }
  }, [streams, currentStreamIndex, stremioServers, selectedServerId]);

  const initializePlayer = async () => {
    // Load platform players
    const platformPlayers = getPlatformSpecificPlayers();
    setPlayers(platformPlayers);

    // Load saved default player or use first available
    const savedPlayer = await loadDefaultPlayer();
    setSelectedPlayer(savedPlayer || (platformPlayers.length > 0 ? platformPlayers[0].name : null));

    // Fetch server configs
    await fetchServerConfigs();
  };

  const loadDefaultPlayer = async () => {
    try {
      const savedDefault = storageService.getItem(DEFAULT_MEDIA_PLAYER_KEY);
      return savedDefault ? JSON.parse(savedDefault) : null;
    } catch (error) {
      console.error('Error loading default player:', error);
      return null;
    }
  };

  const fetchServerConfigs = async () => {
    try {
      const storedServers = storageService.getItem(SERVERS_KEY);
      const defaultStremio: ServerConfig = {
        serverId: 'stremio-default',
        serverType: 'stremio',
        serverName: 'Stremio',
        serverUrl: DEFAULT_STREMIO_URL,
        current: true
      };

      let stremioServerList: ServerConfig[];

      if (!storedServers) {
        stremioServerList = [defaultStremio];
      } else {
        const allServers: ServerConfig[] = JSON.parse(storedServers);
        const filteredStremioServers = allServers.filter(server => server.serverType === 'stremio');
        stremioServerList = filteredStremioServers.length > 0 ? filteredStremioServers : [defaultStremio];
      }

      setStremioServers(stremioServerList);
      const currentServer = stremioServerList.find(server => server.current) || stremioServerList[0];
      setSelectedServerId(currentServer.serverId);
    } catch (error) {
      console.error('Error loading server configurations:', error);
    }
  };

  const getInfoHashFromStream = (stream: Stream): string | null => {
    const { infoHash, magnet, magnetLink } = stream;
    if (infoHash) return infoHash;

    const magnetToUse = magnet || magnetLink;
    if (magnetToUse) {
      const match = magnetToUse.match(/xt=urn:btih:([a-fA-F0-9]{40}|[a-fA-F0-9]{32})/i);
      return match?.[1] || null;
    }
    return null;
  };

  const generatePlayerUrlWithInfoHash = async (infoHash: string, serverUrl: string) => {
    return await generateStremioPlayerUrl(infoHash, serverUrl, type as string, season as string, episode as string);
  };

  const loadStream = async (streamIndex: number) => {
    if (!streams[streamIndex]) return;

    setIsLoadingStream(true);
    setStreamError('');

    const stream = streams[streamIndex];
    const { url } = stream;
    const infoHash = getInfoHashFromStream(stream);

    try {
      let finalVideoUrl = url || '';

      // If no direct URL, generate from infoHash
      if (!url && infoHash) {
        const selectedServer = stremioServers.find(s => s.serverId === selectedServerId);

        if (!selectedServer) {
          throw new Error('No Stremio server configured');
        }

        finalVideoUrl = await generatePlayerUrlWithInfoHash(infoHash, selectedServer.serverUrl);
      }

      if (!finalVideoUrl) {
        throw new Error('Unable to generate video URL');
      }

      setVideoUrl(finalVideoUrl);
      setIsLoadingStream(false);
    } catch (error) {
      console.error('Error loading stream:', error);
      setStreamError(error instanceof Error ? error.message : 'Failed to load stream');
      setIsLoadingStream(false);
    }
  };

  const handleStreamChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < streams.length) {
      setCurrentStreamIndex(newIndex);
    }
  };

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
      const existingHistoryJson = storageService.getItem(WATCH_HISTORY_KEY);
      let history: WatchHistoryItem[] = existingHistoryJson ? JSON.parse(existingHistoryJson) : [];

      if (progress >= minProgressAsWatched) {
        history = history.filter(item =>
          !(item.imdbid === imdbid &&
            item.type === type &&
            item.season === season &&
            item.episode === episode)
        );
        storageService.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
        return;
      }

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

      storageService.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save watch history:', error);
    }
  };

  const syncProgressToTrakt = async (progressPercentage: number) => {
    if (!isTraktAuthenticated || !imdbid) {
      return;
    }

    try {
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
      else if (hasStartedScrobble) {
        const progressDiff = progressPercentage - lastScrobbleProgressRef.current;
        const shouldUpdate = progressDiff >= 15 || (progressPercentage >= 80 && progressDiff >= 5);

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
    if (!isTraktAuthenticated || !imdbid || finalProgress < 1) {
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

      const success = await scrobbleStop(scrobbleData);
      if (success) {
        console.log('Trakt scrobble stopped at', finalProgress, '%');
        setHasStartedScrobble(false);
      }
    } catch (error) {
      console.error('Failed to stop Trakt scrobble:', error);
    }
  };

  const handleBack = async (event: BackEvent): Promise<void> => {
    console.log('BackEvent', event)
    await stopTraktScrobble(Math.floor(event.progress));
    router.back();
  };

  const handleUpdateProgress = async (event: UpdateProgressEvent): Promise<void> => {
    console.log('UpdateEvent', event)
    if (event.progress <= 1)
      return;

    const progressPercentage = Math.floor(event.progress);
    setProgress(progressPercentage);

    await saveToWatchHistory(progressPercentage);
    await syncProgressToTrakt(progressPercentage);
  };

  function getPlayer() {
    if (Platform.OS === "web") {
      return require("../../components/nativeplayer").MediaPlayer;
    }
    return require("../../components/vlcplayer").MediaPlayer;
  }

  const Player = getPlayer();

  if (isLoadingStream) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#535aff" />
        <Text style={styles.loadingText}>Loading stream...</Text>
      </View>
    );
  }

  if (streamError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{streamError}</Text>
        <Pressable style={styles.retryButton} onPress={() => loadStream(currentStreamIndex)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Player
      videoUrl={videoUrl}
      title={title as string}
      back={handleBack}
      progress={progress}
      artwork={artwork as string}
      subtitles={subtitles}
      openSubtitlesClient={openSubtitlesClient}
      isLoadingSubtitles={isLoadingSubtitles}
      updateProgress={handleUpdateProgress}
      streams={streams}
      currentStreamIndex={currentStreamIndex}
      onStreamChange={handleStreamChange}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#535aff',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#252525',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MediaPlayerScreen;