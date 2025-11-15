import OpenSubtitlesClient, { SubtitleResult } from "@/clients/opensubtitles";
import { isUserAuthenticated, scrobbleStart, scrobbleStop } from "@/clients/trakt";
import { generateStremioPlayerUrl } from "@/clients/stremio";
import { Subtitle } from "@/components/coreplayer/models";
import { getLanguageName } from "@/utils/Helpers";
import { StorageKeys, storageService } from "@/utils/StorageService";
import { getPlatformSpecificPlayers, Players } from "@/utils/MediaPlayer";
import { showAlert } from "@/utils/platform";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { Platform, Linking, ActivityIndicator, View, Text, StyleSheet, Pressable } from "react-native";
import { ServerConfig } from "@/components/ServerConfig";
import { useActionSheet } from '@expo/react-native-action-sheet';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
  isFormatError?: boolean;
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
      setVideoUrl(directVideoUrl as string);
      setIsLoadingStream(false);
      initializeClient();
      checkTraktAuth();
      return;
    }

    // Parse streams from params (new playback scenario)
    if (streamsParam) {
      try {
        const parsedStreams = JSON.parse(streamsParam as string);
        setStreams(parsedStreams);

        const initialIndex = selectedStreamIndex ? parseInt(selectedStreamIndex as string) : 0;
        setCurrentStreamIndex(initialIndex);

        // Initialize and show player selection
        initializePlayerAndSelect(parsedStreams, initialIndex);
      } catch (error) {
        console.error('Failed to parse streams:', error);
        setStreamError('Failed to load streams');
        setIsLoadingStream(false);
      }
    }

    initializeClient();
    checkTraktAuth();
  }, []);

  useEffect(() => {
    if (openSubtitlesClient) {
      fetchSubtitles();
    }
  }, [imdbid, type, season, episode, openSubtitlesClient]);

  const initializePlayerAndSelect = async (parsedStreams: Stream[], streamIndex: number) => {
    // Load platform players
    const platformPlayers = getPlatformSpecificPlayers();
    setPlayers(platformPlayers);

    // Load saved default player
    const savedPlayer = await loadDefaultPlayer();

    // Fetch server configs and get the values immediately
    const { servers: serverList, selectedId } = await fetchServerConfigs();

    // If no default player, show selection
    if (!savedPlayer) {
      showPlayerSelection(parsedStreams[streamIndex], streamIndex, platformPlayers, serverList, selectedId);
    } else {
      setSelectedPlayer(savedPlayer);

      // If default player, load stream for built-in player
      if (savedPlayer === Players.Default) {
        await loadStream(streamIndex, parsedStreams);
      } else {
        // For external players, handle opening with the loaded server config
        handleExternalPlayer(parsedStreams[streamIndex], savedPlayer, platformPlayers, serverList, selectedId);
      }
    }
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

  const fetchServerConfigs = async (): Promise<{ servers: ServerConfig[], selectedId: string }> => {
    try {
      const storedServers = storageService.getItem(SERVERS_KEY);
      console.log('servers', storedServers)
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

      const currentServer = stremioServerList.find(server => server.current) || stremioServerList[0];

      // Set state for UI updates
      setStremioServers(stremioServerList);
      setSelectedServerId(currentServer.serverId);

      console.log('server list', stremioServerList)
      console.log('current server', currentServer)

      // Return the values for immediate use
      return {
        servers: stremioServerList,
        selectedId: currentServer.serverId
      };
    } catch (error) {
      console.error('Error loading server configurations:', error);
      const defaultStremio: ServerConfig = {
        serverId: 'stremio-default',
        serverType: 'stremio',
        serverName: 'Stremio',
        serverUrl: DEFAULT_STREMIO_URL,
        current: true
      };
      return {
        servers: [defaultStremio],
        selectedId: 'stremio-default'
      };
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
    setStatusText('Generating stream URL...');
    return await generateStremioPlayerUrl(infoHash, serverUrl, type as string, season as string, episode as string);
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

  const loadStream = async (streamIndex: number, streamList?: Stream[]) => {
    const streamsToUse = streamList || streams;
    if (!streamsToUse[streamIndex]) return;

    setIsLoadingStream(true);
    setStreamError('');
    setCurrentPlayerType("native");
    setHasTriedNative(false);

    const stream = streamsToUse[streamIndex];
    const { url } = stream;
    const infoHash = getInfoHashFromStream(stream);

    try {
      let finalVideoUrl = url || '';

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

  const handleExternalPlayer = async (
    stream: Stream,
    playerName: string,
    playersList?: any[],
    serverList?: ServerConfig[],
    serverId?: string
  ) => {
    if (isProcessing) return;

    setIsProcessing(true);
    handleOpenBottomSheet();

    const { url } = stream;
    const infoHash = getInfoHashFromStream(stream);

    // Use passed parameters or fall back to state
    const serversToUse = serverList || stremioServers;
    const serverIdToUse = serverId || selectedServerId;

    console.log('servers', serversToUse);
    console.log('serveridhere', serverIdToUse);

    const selectedServer = serversToUse.find(s => s.serverId === serverIdToUse);

    console.log('selected server', selectedServer)
    if (!selectedServer && !url && infoHash) {
      setStatusText('Error: Stremio server not configured');
      showAlert('Error', 'Stremio server configuration not found');
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

    try {
      let videoUrl = url || '';

      if (!url && infoHash && selectedServer) {
        setStatusText('Processing stream...');
        videoUrl = await generatePlayerUrlWithInfoHash(infoHash, selectedServer.serverUrl);
      }

      if (!videoUrl) {
        setStatusText('Error: Unable to generate video URL');
        showAlert('Error', 'Unable to generate a valid video URL');
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
    serverId?: string
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
        titleTextStyle: { color: '#535aff', fontWeight: '500' },
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
          loadStream(index);
        } else {
          handleExternalPlayer(stream, selectedPlayerName, playersToUse, serverList, serverId);
        }
      }
    );
  };

  const handleStreamChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < streams.length) {
      setCurrentStreamIndex(newIndex);
      const newStream = streams[newIndex];

      // If using default player, load new stream
      if (selectedPlayer === Players.Default && newStream.url) {
        setVideoUrl(newStream.url);
        setCurrentPlayerType("native");
        setHasTriedNative(false);
      }
    }
  };

  const handlePlaybackError = (event: PlaybackErrorEvent) => {
    console.log('Playback error:', event);

    if (currentPlayerType === "native" && !hasTriedNative && Platform.OS !== "web") {
      console.log('Native player failed, falling back to VLC');
      setHasTriedNative(true);
      setCurrentPlayerType("vlc");
    } else {
      setStreamError(event.error || 'Playback failed');
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
    await stopTraktScrobble(Math.floor(event.progress));
    router.back();
  };

  const handleUpdateProgress = async (event: UpdateProgressEvent): Promise<void> => {
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
          <ActivityIndicator size="large" color="#535aff" />
          <Text style={styles.loadingText}>Loading stream...</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (streamError) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{streamError}</Text>
          {currentPlayerType === "vlc" && (
            <Text style={styles.infoText}>VLC player was unable to play this format</Text>
          )}
          <Pressable style={styles.retryButton} onPress={() => {
            setStreamError('');
            setCurrentPlayerType("native");
            setHasTriedNative(false);
            loadStream(currentStreamIndex);
          }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    marginBottom: 12,
  },
  infoText: {
    color: '#999',
    fontSize: 14,
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
    fontWeight: '600',
  },
});

export default MediaPlayerScreen;