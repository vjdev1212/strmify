import OpenSubtitlesClient, { SubtitleResult } from "@/clients/opensubtitles";
import { isUserAuthenticated, scrobbleStart, scrobbleStop } from "@/clients/trakt";
import { Subtitle } from "@/components/coreplayer/models";
import { getLanguageName } from "@/utils/Helpers";
import { StorageKeys, storageService } from "@/utils/StorageService";
import { getPlatformSpecificPlayers, Players } from "@/utils/MediaPlayer";
import { showAlert } from "@/utils/platform";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { Platform, Linking, ActivityIndicator, View, Text, StyleSheet, Pressable, Image, StatusBar } from "react-native";
import { ServerConfig } from "@/components/ServerConfig";
import { useActionSheet } from '@expo/react-native-action-sheet';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StreamingServerClient } from "@/clients/stremio";
import * as ScreenOrientation from 'expo-screen-orientation';

interface BackEvent {
  message: string;
  code?: string;
  progress: number;
  player: "native" | "vlc",
}

interface UpdateProgressEvent {
  progress: number
}

interface PlaybackErrorEvent {
  error: string;
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
const DEFAULT_MEDIA_PLAYER_KEY = StorageKeys.DEFAULT_MEDIA_PLAYER_KEY;
const SERVERS_KEY = StorageKeys.SERVERS_KEY;

const MediaPlayerScreen: React.FC = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { showActionSheetWithOptions } = useActionSheet();

  const {
    streams: streamsParam,
    selectedStreamIndex,
    videoUrl: directVideoUrl,
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
  const [isTorrent, setIsTorrent] = useState<boolean>(false);

  // Stremio client instance
  const [stremioClient, setStremioClient] = useState<StreamingServerClient | null>(null);

  // Player fallback state
  const [currentPlayerType, setCurrentPlayerType] = useState<"native" | "vlc">("native");
  const [hasTriedNative, setHasTriedNative] = useState(false);

  // Bottom sheet state
  const [statusText, setStatusText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%', '60%'], []);

  // Trakt scrobbling state
  const [isTraktAuthenticated, setIsTraktAuthenticated] = useState(false);
  const [hasStartedScrobble, setHasStartedScrobble] = useState(false);
  const lastScrobbleProgressRef = useRef<number>(0);

  useEffect(() => {
    if (!isLoadingStream && !streamError) {
      navigation.setOptions({ headerShown: false });
    } else {
      navigation.setOptions({ headerShown: true });
    }
  }, [isLoadingStream, streamError, navigation]);

  useEffect(() => {
    // Check if we have a direct video URL (continue watching scenario)
    if (directVideoUrl) {
      // Setup orientation for in-app playback
      setupOrientation();
      setVideoUrl(directVideoUrl as string);
      setIsLoadingStream(false);
      initializeClient();
      checkTraktAuth();
      return () => {
        cleanupOrientation();
      };
    }

    // Parse streams from params (new playback scenario)
    if (streamsParam) {
      try {
        const parsedStreams = JSON.parse(streamsParam as string);
        setStreams(parsedStreams);

        const initialIndex = selectedStreamIndex ? parseInt(selectedStreamIndex as string) : 0;
        setCurrentStreamIndex(initialIndex);

        // Check if there's a saved default player
        const savedPlayer = loadDefaultPlayer();
        
        if (!savedPlayer) {
          // No saved player - need to show selection
          // Don't initialize clients yet, keep loading state
          const platformPlayers = getPlatformSpecificPlayers();
          setPlayers(platformPlayers);
          const { servers: serverList, selectedId } = fetchServerConfigs();
          
          // Show player selection immediately
          showPlayerSelection(parsedStreams[initialIndex], initialIndex, platformPlayers, serverList, selectedId);
        } else {
          // Has saved player - proceed with initialization
          initializePlayerAndSelect(parsedStreams, initialIndex);
        }
      } catch (error) {
        console.error('Failed to parse streams:', error);
        setStreamError('Failed to load streams');
        setIsLoadingStream(false);
      }
    }

    initializeClient();
    checkTraktAuth();
    
    return () => {
      cleanupOrientation();
    }
  }, []);  

  useEffect(() => {
    if (openSubtitlesClient) {
      fetchSubtitles();
    }
  }, [imdbid, type, season, episode, openSubtitlesClient]);

  useEffect(() => {
    if (currentPlayerType === "vlc" && hasTriedNative) {
      console.log('Switching to VLC player');
      setStreamError('');
      setIsLoadingStream(false);
    }
  }, [currentPlayerType, hasTriedNative]);

  const initializePlayerAndSelect = async (parsedStreams: Stream[], streamIndex: number) => {
    const platformPlayers = getPlatformSpecificPlayers();
    setPlayers(platformPlayers);

    const savedPlayer = loadDefaultPlayer();
    const { servers: serverList, selectedId } = fetchServerConfigs();

    if (!savedPlayer) {
      showPlayerSelection(parsedStreams[streamIndex], streamIndex, platformPlayers, serverList, selectedId);
    } else {
      setSelectedPlayer(savedPlayer);

      if (savedPlayer === Players.Default) {
        // Only setup orientation for in-app playback
        setupOrientation();
        await loadStream(streamIndex, parsedStreams, serverList, selectedId);
      } else {
        // External player - no orientation change
        handleExternalPlayer(parsedStreams[streamIndex], savedPlayer, platformPlayers, serverList, selectedId);
      }
    }
  };

  const setupOrientation = async () => {
    if (Platform.OS !== 'web') {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        StatusBar.setHidden(true);
      } catch (error) {
        console.warn("Failed to set orientation:", error);
      }
    }
  };

  const cleanupOrientation = async () => {
    if (Platform.OS !== 'web') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
      StatusBar.setHidden(false);
    }
  };


  const loadDefaultPlayer = () => {
    try {
      const savedDefault = storageService.getItem(DEFAULT_MEDIA_PLAYER_KEY);
      return savedDefault ? JSON.parse(savedDefault) : null;
    } catch (error) {
      console.error('Error loading default player:', error);
      return null;
    }
  };

  const fetchServerConfigs = (): { servers: ServerConfig[], selectedId: string | null } => {
    try {
      const storedServers = storageService.getItem(SERVERS_KEY);

      if (!storedServers) {
        setStremioServers([]);
        setSelectedServerId(null);
        setStremioClient(null);

        return { servers: [], selectedId: null };
      }

      const allServers: ServerConfig[] = JSON.parse(storedServers);
      const filteredStremioServers = allServers.filter(server => server.serverType === 'stremio');

      if (filteredStremioServers.length === 0) {
        setStremioServers([]);
        setSelectedServerId(null);
        setStremioClient(null);

        return { servers: [], selectedId: null };
      }

      const currentServer = filteredStremioServers.find(server => server.current) || filteredStremioServers[0];

      setStremioServers(filteredStremioServers);
      setSelectedServerId(currentServer.serverId);

      const client = new StreamingServerClient(currentServer.serverUrl);
      setStremioClient(client);

      return {
        servers: filteredStremioServers,
        selectedId: currentServer.serverId
      };
    } catch (error) {
      console.error('Error loading server configurations:', error);

      setStremioServers([]);
      setSelectedServerId(null);
      setStremioClient(null);

      return { servers: [], selectedId: null };
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

  const generatePlayerUrlWithInfoHash = async (
    infoHash: string,
    serverUrl: string,
    fileIdx: number,
    client?: StreamingServerClient
  ): Promise<string> => {
    setStatusText('Generating stream URL...');

    const clientToUse = client || new StreamingServerClient(serverUrl);

    try {
      const streamUrl = await clientToUse.getStreamingURL(infoHash, fileIdx);
      return streamUrl;
    } catch (error) {
      console.error('Error generating stream URL:', error);
      throw new Error(`Failed to generate stream URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOpenBottomSheet = () => {
    bottomSheetRef.current?.snapToIndex(1);
  };

  const handleCloseBottomSheet = () => {
    bottomSheetRef.current?.close();
    setTimeout(() => {
      setStatusText('');
      setIsProcessing(false);
    }, 300);
  };

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.5}
    />
  );

  const loadStream = async (
    streamIndex: number,
    streamList?: Stream[],
    serverList?: ServerConfig[],
    serverId?: string | null
  ) => {
    const streamsToUse = streamList || streams;
    if (!streamsToUse[streamIndex]) return;

    setIsLoadingStream(true);
    setStreamError('');
    setCurrentPlayerType("native");
    setHasTriedNative(false);

    const stream = streamsToUse[streamIndex];
    const { url } = stream;
    const infoHash = getInfoHashFromStream(stream);
    const isTorrentStream = !url && !!infoHash;

    try {
      let finalVideoUrl: string = url || '';

      if (isTorrentStream) {
        // Torrent stream - requires Stremio server
        const serversToUse = serverList || stremioServers;
        const serverIdToUse = serverId !== undefined ? serverId : selectedServerId;

        if (!serverIdToUse || serversToUse.length === 0) {
          throw new Error('Stremio server is required for torrent streams. Please configure a Stremio server in settings.');
        }

        const selectedServer = serversToUse.find(s => s.serverId === serverIdToUse);

        if (!selectedServer) {
          throw new Error('Stremio server is required for torrent streams. Please configure a Stremio server in settings.');
        }

        setIsTorrent(true);

        // Torrent + Stremio Server + Default Player = Always transcode (force HLS)
        const fileIdx = type === 'series' ? parseInt(episode as string) : 0;
        finalVideoUrl = await generatePlayerUrlWithInfoHash(
          infoHash!,
          selectedServer.serverUrl,
          fileIdx,
          stremioClient || undefined
        );
      } else {
        if (!url) {
          return;
        }
        finalVideoUrl = url;
        setIsTorrent(false);
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

  const handleExternalPlayer = async (
    stream: Stream,
    playerName: string,
    playersList?: any[],
    serverList?: ServerConfig[],
    serverId?: string | null
  ) => {
    if (isProcessing) return;

    setIsProcessing(true);
    handleOpenBottomSheet();

    const { url } = stream;
    const infoHash = getInfoHashFromStream(stream);
    const isTorrentStream = !url && !!infoHash;

    try {
      let videoUrl: string = url || '';

      if (isTorrentStream) {
        // Torrent + External Player - requires Stremio server, NO transcoding
        const serversToUse = serverList || stremioServers;
        const serverIdToUse = serverId !== undefined ? serverId : selectedServerId;

        if (!serverIdToUse || serversToUse.length === 0) {
          setStatusText('Error: Stremio server required for torrent streams');
          showAlert('Error', 'Stremio server is required for torrent streams. Please configure a Stremio server in settings.');
          handleCloseBottomSheet();
          return;
        }

        const selectedServer = serversToUse.find(s => s.serverId === serverIdToUse);

        if (!selectedServer) {
          setStatusText('Error: Stremio server not found');
          showAlert('Error', 'Stremio server configuration not found');
          handleCloseBottomSheet();
          return;
        }

        setStatusText('Generating direct stream URL...');

        // Torrent + Stremio Server + External Player = NO transcoding, direct URL
        const fileIdx = type === 'series' ? parseInt(episode as string) : 0;
        const directURL = `${selectedServer.serverUrl}/${encodeURIComponent(infoHash!)}/${encodeURIComponent(fileIdx)}`;
        videoUrl = directURL;
      }
      // else: Direct Stream + External Player = Use direct URL (no Stremio server check needed)

      if (!videoUrl) {
        setStatusText('Error: Unable to generate video URL');
        showAlert('Error', 'Unable to generate a valid video URL');
        handleCloseBottomSheet();
        return;
      }

      const playersToUse = playersList || players;
      const player = playersToUse.find((p: any) => p.name === playerName);

      if (!player) {
        setStatusText('Error: Invalid Media Player selection');
        showAlert('Error', 'Invalid Media Player selection');
        handleCloseBottomSheet();
        return;
      }

      const urlJs = new URL(videoUrl);
      const filename = urlJs.pathname.split('/').pop() || '';
      const streamUrl = player.encodeUrl ? encodeURIComponent(videoUrl) : videoUrl;
      const playerUrl = player.scheme.replace('STREAMURL', streamUrl).replace('STREAMTITLE', filename);

      setStatusText('Opening in external player...');
      await Linking.openURL(playerUrl);

      setTimeout(() => {
        handleCloseBottomSheet();
        router.back();
      }, 1000);
    } catch (error) {
      console.error('Error opening external player:', error);
      setStatusText('Error: Failed to open external player');
      showAlert('Error', 'Failed to open the external player');
      handleCloseBottomSheet();
    } finally {
      setIsProcessing(false);
    }
  };

  const showPlayerSelection = (
    stream: Stream,
    index: number,
    playersList?: any[],
    serverList?: ServerConfig[],
    serverId?: string | null
  ) => {
    const playersToUse = playersList || players;
    const playerOptions = [...playersToUse.map((player: any) => player.name), 'Cancel'];

    showActionSheetWithOptions(
      {
        options: playerOptions,
        cancelButtonIndex: playerOptions.length - 1,
        title: 'Media Player',
        message: 'Select the Media Player for Streaming',
        messageTextStyle: { color: '#ffffff', fontSize: 12 },
        textStyle: { color: '#ffffff' },
        titleTextStyle: { color: '#535aff', fontWeight: 500 },
        containerStyle: { backgroundColor: '#101010' },
        userInterfaceStyle: 'dark'
      },
      (selectedIndex?: number) => {
        if (selectedIndex === undefined || selectedIndex === playerOptions.length - 1) {
          router.back();
          return;
        }

        const selectedPlayerName = playersToUse[selectedIndex].name;
        setSelectedPlayer(selectedPlayerName);

        if (selectedPlayerName === Players.Default) {
          // Setup orientation for in-app playback
          setupOrientation();
          // Now that we know it's default player, initialize clients
          initializeClient();
          checkTraktAuth();
          loadStream(index, undefined, serverList, serverId);
        } else {
          // External player - no orientation change, no need for clients
          handleExternalPlayer(stream, selectedPlayerName, playersToUse, serverList, serverId);
        }
      }
    );
  };

  const handleStreamChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < streams.length) {
      setCurrentStreamIndex(newIndex);
      const newStream = streams[newIndex];

      if (selectedPlayer === Players.Default) {
        if (newStream.url) {
          setVideoUrl(newStream.url);
          setCurrentPlayerType("native");
          setHasTriedNative(false);
        } else {
          loadStream(newIndex);
        }
      }
    }
  };

  const handlePlaybackError = (event: PlaybackErrorEvent) => {
    console.log('Playback error:', event);

    // Only attempt VLC fallback for format errors on non-web platforms
    if (
      currentPlayerType === "native" &&
      !hasTriedNative &&
      Platform.OS !== "web"
    ) {
      console.log('Native player failed, falling back to VLC');

      setHasTriedNative(true);
      setStreamError('');
      setCurrentPlayerType("vlc");
      setTimeout(() => {
        // Trigger re-load with current video URL
        // The player will re-render as VLC due to currentPlayerType change
        console.log('VLC player ready, video URL:', videoUrl);
      }, 100);

    } else {
      // Show error - either VLC also failed or no fallback available
      const errorMessage = currentPlayerType === "vlc"
        ? 'VLC player was unable to play this format. The video codec may not be supported.'
        : (event.error || 'Playback failed');

      console.log('Final playback error:', errorMessage);
      setStreamError(errorMessage);
      setIsLoadingStream(false);
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

  const saveToWatchHistory = (progress: number) => {
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
      saveToWatchHistory(finalProgress);

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
    await stopTraktScrobble(Math.floor(event.progress));
    router.back();
  };

  const handleUpdateProgress = async (event: UpdateProgressEvent): Promise<void> => {
    if (event.progress <= 1)
      return;

    const progressPercentage = Math.floor(event.progress);
    setProgress(progressPercentage);

    saveToWatchHistory(progressPercentage);
    await syncProgressToTrakt(progressPercentage);
  };

  function getPlayer() {
    if (Platform.OS === "web") {
      return require("../../components/nativeplayer").MediaPlayer;
    }

    if (currentPlayerType === "vlc") {
      return require("../../components/vlcplayer").MediaPlayer;
    }

    return require("../../components/nativeplayer").MediaPlayer;
  }

  const Player = getPlayer();

  if (isLoadingStream) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          {artwork && (
            <Image
              source={{ uri: artwork }}
              style={styles.backdropImage}
            />
          )}
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#535aff" />
            <Text style={styles.loadingText}>Loading stream. Please wait...</Text>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Player
        videoUrl={videoUrl}
        isTorrent={isTorrent}
        title={title as string}
        back={handleBack}
        progress={progress}
        artwork={artwork as string}
        subtitles={subtitles}
        openSubtitlesClient={openSubtitlesClient}
        isLoadingSubtitles={isLoadingSubtitles}
        updateProgress={handleUpdateProgress}
        onPlaybackError={handlePlaybackError}
        streams={streams}
        currentStreamIndex={currentStreamIndex}
        onStreamChange={handleStreamChange}
      />

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
        onChange={(index) => {
          if (index === -1) {
            setStatusText('');
            setIsProcessing(false);
          }
        }}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#535aff" style={styles.bottomSheetLoader} />
            <Text style={styles.statusText}>{statusText}</Text>
            <Pressable
              style={styles.cancelButton}
              onPress={handleCloseBottomSheet}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backdropImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.2
  },
  loadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 16,
    fontWeight: 500,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    borderRadius: 24,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center'
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#ff6b6b',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  errorSubMessage: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  errorButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#535aff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#535aff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
  },
  bottomSheetBackground: {
    backgroundColor: '#101010',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  bottomSheetIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 40,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 20
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  bottomSheetLoader: {
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  cancelButton: {
    backgroundColor: '#535aff',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 600,
  },
});

export default MediaPlayerScreen;