import OpenSubtitlesClient, { SubtitleResult } from "@/clients/opensubtitles";
import { Subtitle } from "@/components/coreplayer/models";
import { StorageKeys, storageService } from "@/utils/StorageService";
import { getPlatformSpecificPlayers, Players } from "@/utils/MediaPlayer";
import { showAlert } from "@/utils/platform";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, Linking, ActivityIndicator, View, Text, StyleSheet, Image, StatusBar } from "react-native";
import { ServerConfig } from "@/components/ServerConfig";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StreamingServerClient } from "@/clients/stremio";
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTheme } from '@/context/ThemeContext';

interface UpdateProgressEvent { progress: number }
interface PlaybackErrorEvent { error: string }
interface BackEvent { message: string; code?: string; progress: number; player: "native" | "ksplayer" }

interface WatchHistoryItem {
  title: string; videoUrl: string; imdbid: string; type: string;
  season: string; episode: string; progress: number; artwork: string; timestamp: number;
}

interface Stream {
  name: string; title?: string; url?: string; embed?: string;
  infoHash?: string; magnet?: string; magnetLink?: string;
  description?: string; fileIdx?: number;
}

const WATCH_HISTORY_KEY = StorageKeys.WATCH_HISTORY_KEY;
const MAX_HISTORY_ITEMS = 30;
const DEFAULT_MEDIA_PLAYER_KEY = StorageKeys.DEFAULT_MEDIA_PLAYER_KEY;
const SERVERS_KEY = StorageKeys.SERVERS_KEY;
const SUBTITLE_LANGUAGES_KEY = StorageKeys.SUBTITLE_LANGUAGES_KEY;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInfoHashFromStream(stream: Stream): string | null {
  if (stream.infoHash) return stream.infoHash;
  const magnet = stream.magnet || stream.magnetLink;
  if (magnet) {
    const match = magnet.match(/xt=urn:btih:([a-fA-F0-9]{40}|[a-fA-F0-9]{32})/i);
    return match?.[1] ?? null;
  }
  return null;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const MediaPlayerScreen: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const {
    streams: streamsParam,
    selectedStreamIndex,
    videoUrl: directVideoUrl,
    title,
    imdbid,
    type,
    season,
    episode,
    progress: watchHistoryProgress,
  } = useLocalSearchParams();

  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(true);
  const [openSubtitlesClient, setOpenSubtitlesClient] = useState<OpenSubtitlesClient | null>(null);
  const [progress, setProgress] = useState(watchHistoryProgress || 0);
  const artwork = `https://images.metahub.space/background/medium/${imdbid}/img`;

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
  const [stremioClient, setStremioClient] = useState<StreamingServerClient | null>(null);

  const [currentPlayerType, setCurrentPlayerType] = useState<"native" | "ksplayer">(
    Platform.OS === "ios" ? "ksplayer" : "native"
  );
  const [hasTriedNative, setHasTriedNative] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (Platform.OS !== 'web') {
        try {
          await ScreenOrientation.unlockAsync();
          await new Promise(r => setTimeout(r, 100));
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          navigation.setOptions({ gestureEnabled: false });
          StatusBar.setHidden(true, 'slide');
        } catch (e) {
          console.warn('Orientation lock failed:', e);
        }
      }

      if (cancelled) return;

      // ── Case 1: direct video URL passed in (no stream list involved) ──
      if (directVideoUrl) {
        setVideoUrl(directVideoUrl as string);
        setIsLoadingStream(false);
        initializeClient();
        return;
      }

      // ── Case 2: streams array passed in (fileIdx already resolved by StreamListScreen) ──
      if (streamsParam) {
        try {
          const parsedStreams = JSON.parse(streamsParam as string) as Stream[];
          setStreams(parsedStreams);
          const initialIndex = selectedStreamIndex ? parseInt(selectedStreamIndex as string) : 0;
          setCurrentStreamIndex(initialIndex);

          const savedPlayer = loadDefaultPlayer();
          const { servers, selectedId } = fetchServerConfigs();

          if (!savedPlayer || savedPlayer === Players.Default) {
            setSelectedPlayer(Players.Default);
            setPlayers(getPlatformSpecificPlayers());
            await resolveAndLoadStream(parsedStreams[initialIndex], servers, selectedId);
          } else {
            setPlayers(getPlatformSpecificPlayers());
            setSelectedPlayer(savedPlayer);
            handleExternalPlayer(parsedStreams[initialIndex], savedPlayer, getPlatformSpecificPlayers(), servers, selectedId);
          }
        } catch (error) {
          console.error('Failed to parse streams:', error);
          setStreamError('Failed to load streams');
          setIsLoadingStream(false);
        }
      }

      initializeClient();
    };

    init();

    return () => {
      cancelled = true;
      (async () => {
        try {
          await ScreenOrientation.unlockAsync();
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          navigation.setOptions({ gestureEnabled: true });
          StatusBar.setHidden(false, 'slide');
        } catch { }
      })();
    };
  }, []);

  useEffect(() => {
    if (openSubtitlesClient) fetchSubtitles();
  }, [imdbid, type, season, episode, openSubtitlesClient]);

  useEffect(() => {
    if (currentPlayerType === "ksplayer" && hasTriedNative) {
      setStreamError('');
      setIsLoadingStream(false);
    }
  }, [currentPlayerType, hasTriedNative]);

  // ── Stream resolution ──────────────────────────────────────────────────────

  /**
   * Resolves a stream to a playable URL.
   * Since fileIdx is already selected upstream (in StreamListScreen),
   * we just need to convert infoHash → streaming URL via the Stremio server.
   */
  const resolveAndLoadStream = async (
    stream: Stream,
    serverList?: ServerConfig[],
    serverId?: string | null,
  ) => {
    if (!stream) return;
    setIsLoadingStream(true);
    setStreamError('');
    setCurrentPlayerType(Platform.OS === "ios" ? "ksplayer" : "native");
    setHasTriedNative(false);

    const { url, fileIdx } = stream;
    const infoHash = getInfoHashFromStream(stream);
    const isTorrentStream = !url && !!infoHash;

    try {
      let finalUrl = url ?? '';

      if (isTorrentStream) {
        // fileIdx was already chosen in StreamListScreen — just generate the URL.
        const serversToUse = serverList ?? stremioServers;
        const serverIdToUse = serverId !== undefined ? serverId : selectedServerId;

        if (!serverIdToUse || serversToUse.length === 0) {
          throw new Error(
            'A Stremio server is required to play torrent streams. Please configure one in Settings.'
          );
        }

        const server = serversToUse.find(s => s.serverId === serverIdToUse);
        if (!server) throw new Error('Stremio server configuration not found.');

        setIsTorrent(true);
        const client = stremioClient ?? new StreamingServerClient(server.serverUrl);
        finalUrl = await client.getStreamingURL(infoHash!, fileIdx ?? -1);
      } else {
        if (!url) throw new Error('No playable URL found for this stream.');
        setIsTorrent(false);
        finalUrl = url;
      }

      if (!finalUrl) throw new Error('Unable to generate a video URL.');
      setVideoUrl(finalUrl);
      setIsLoadingStream(false);
    } catch (error) {
      console.error('Stream resolution error:', error);
      setStreamError(error instanceof Error ? error.message : 'Failed to load stream');
      setIsLoadingStream(false);
    }
  };

  // ── Stream switching (from within the player controls) ─────────────────────

  const handleStreamChange = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= streams.length) return;
    setCurrentStreamIndex(newIndex);
    const stream = streams[newIndex];
    if (selectedPlayer === Players.Default) {
      if (stream.url) {
        setVideoUrl(stream.url);
        setCurrentPlayerType("native");
        setHasTriedNative(false);
      } else {
        resolveAndLoadStream(stream);
      }
    }
  };

  // ── Server / player config ─────────────────────────────────────────────────

  const loadDefaultPlayer = () => {
    try {
      const saved = storageService.getItem(DEFAULT_MEDIA_PLAYER_KEY);
      return saved ? JSON.parse(saved) : Players.Default;
    } catch {
      return null;
    }
  };

  const fetchServerConfigs = (): { servers: ServerConfig[]; selectedId: string | null } => {
    try {
      const stored = storageService.getItem(SERVERS_KEY);
      if (!stored) { setStremioServers([]); setSelectedServerId(null); setStremioClient(null); return { servers: [], selectedId: null }; }

      const allServers: ServerConfig[] = JSON.parse(stored);
      const stremio = allServers.filter(s => s.serverType === 'stremio');
      if (stremio.length === 0) { setStremioServers([]); setSelectedServerId(null); setStremioClient(null); return { servers: [], selectedId: null }; }

      const current = stremio.find(s => s.current) ?? stremio[0];
      setStremioServers(stremio);
      setSelectedServerId(current.serverId);
      const client = new StreamingServerClient(current.serverUrl);
      setStremioClient(client);
      return { servers: stremio, selectedId: current.serverId };
    } catch {
      setStremioServers([]); setSelectedServerId(null); setStremioClient(null);
      return { servers: [], selectedId: null };
    }
  };

  // ── External player ────────────────────────────────────────────────────────

  const handleExternalPlayer = async (
    stream: Stream,
    playerName: string,
    playersList?: any[],
    serverList?: ServerConfig[],
    serverId?: string | null,
  ) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const { url, fileIdx } = stream;
      const infoHash = getInfoHashFromStream(stream);
      let resolvedUrl = url ?? '';

      if (!url && infoHash) {
        const serversToUse = serverList ?? stremioServers;
        const serverIdToUse = serverId !== undefined ? serverId : selectedServerId;
        if (!serverIdToUse || serversToUse.length === 0) {
          showAlert('Error', 'Stremio server required for torrent streams.');
          return;
        }
        const server = serversToUse.find(s => s.serverId === serverIdToUse);
        if (!server) { showAlert('Error', 'Stremio server configuration not found.'); return; }
        resolvedUrl = `${server.serverUrl}/${encodeURIComponent(infoHash)}/${encodeURIComponent(fileIdx ?? -1)}`;
      }

      if (!resolvedUrl) { showAlert('Error', 'Unable to generate a valid video URL.'); return; }

      const playersToUse = playersList ?? players;
      const player = playersToUse.find((p: any) => p.name === playerName);
      if (!player) { showAlert('Error', 'Invalid media player selection.'); return; }

      const urlJs = new URL(resolvedUrl);
      const filename = urlJs.pathname.split('/').pop() ?? '';
      const streamUrl = player.encodeUrl ? encodeURIComponent(resolvedUrl) : resolvedUrl;
      const playerUrl = player.scheme.replace('STREAMURL', streamUrl).replace('STREAMTITLE', filename);
      await Linking.openURL(playerUrl);
      setTimeout(() => router.back(), 1000);
    } catch (error) {
      console.error('External player error:', error);
      showAlert('Error', 'Failed to open the external player.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Playback callbacks ─────────────────────────────────────────────────────

  const handlePlaybackError = (event: PlaybackErrorEvent) => {
    if (Platform.OS === "ios" && currentPlayerType === "ksplayer" && !hasTriedNative) {
      setHasTriedNative(true);
      setStreamError('');
      setCurrentPlayerType("native");
    } else {
      setStreamError(event.error || 'Playback failed');
      setIsLoadingStream(false);
    }
  };

  const handleBack = async (event: BackEvent): Promise<void> => {
    saveToWatchHistory(Math.floor(event.progress));
    router.back();
  };

  const handleUpdateProgress = async (event: UpdateProgressEvent): Promise<void> => {
    if (event.progress <= 1) return;
    const pct = Math.floor(event.progress);
    setProgress(pct);
    saveToWatchHistory(pct);
  };

  // ── Subtitles ──────────────────────────────────────────────────────────────

  const initializeClient = async () => {
    try {
      const customApiKey = storageService.getItem(StorageKeys.OPENSUBTITLES_API_KEY);
      setOpenSubtitlesClient(new OpenSubtitlesClient(customApiKey));
    } catch {
      setOpenSubtitlesClient(null);
      setSubtitles([]);
      setIsLoadingSubtitles(false);
    }
  };

  const fetchSubtitles = async () => {
    if (!openSubtitlesClient) { setIsLoadingSubtitles(false); return; }
    try {
      setIsLoadingSubtitles(true);
      const langsConfig = storageService.getItem(SUBTITLE_LANGUAGES_KEY);
      const subtitleLanguages: string[] = langsConfig ? JSON.parse(langsConfig) : ['en'];
      const isEpisode = type === 'series' && season && episode;

      if (imdbid) {
        const params: any = {
          imdb_id: imdbid as string,
          languages: subtitleLanguages.join(','),
          format: 'srt',
          ai_translated: 'include',
          machine_translated: 'include',
          trusted_sources: 'include',
          hearing_impaired: 'include',
        };
        if (isEpisode) { params.type = 'episode'; params.season_number = parseInt(season as string, 10); params.episode_number = parseInt(episode as string, 10); }
        else { params.type = 'movie'; }

        const res = await openSubtitlesClient.searchSubtitles(params);
        if (res.success && res.data.length > 0) {
          const sorted = res.data.sort((a: any, b: any) => b.download_count - a.download_count);
          setSubtitles(sorted.map((s: SubtitleResult) => ({ fileId: s.file_id, language: s.language, url: s.url, label: s.name })));
          setIsLoadingSubtitles(false);
          return;
        }
      }

      const query = (title as string).replace(/[:|,;.!?'"\/\\@#$%^&*_+=\[\]{}<>~`-]/g, '').replace(/\s+/g, ' ').trim();
      const res = await openSubtitlesClient.searchByFileName(query, subtitleLanguages, { format: 'srt', ai_translated: 'include', machine_translated: 'include', trusted_sources: 'include', hearing_impaired: 'include' });
      if (res.success) {
        const sorted = res.data.sort((a: any, b: any) => b.download_count - a.download_count);
        setSubtitles(sorted.map((s: SubtitleResult) => ({ fileId: s.file_id, language: s.language, url: s.url, label: s.name })));
      } else {
        setSubtitles([]);
      }
    } catch {
      setSubtitles([]);
    } finally {
      setIsLoadingSubtitles(false);
    }
  };

  // ── Watch history ──────────────────────────────────────────────────────────

  const saveToWatchHistory = (prog: number) => {
    try {
      const json = storageService.getItem(WATCH_HISTORY_KEY);
      let history: WatchHistoryItem[] = json ? JSON.parse(json) : [];

      if (prog >= 95) {
        history = history.filter(i => !(i.imdbid === imdbid && i.type === type && i.season === season && i.episode === episode));
        storageService.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
        return;
      }

      const item: WatchHistoryItem = { title: title as string, videoUrl: videoUrl as string, progress: prog, artwork, imdbid: imdbid as string, type: type as string, season: season as string, episode: episode as string, timestamp: Date.now() };
      const idx = history.findIndex(i => i.imdbid === imdbid && i.type === type && i.season === season && i.episode === episode);
      if (idx !== -1) { history[idx] = { ...history[idx], videoUrl: videoUrl as string, progress: prog, timestamp: Date.now() }; const [u] = history.splice(idx, 1); history.unshift(u); }
      else { history.unshift(item); }
      if (history.length > MAX_HISTORY_ITEMS) history = history.slice(0, MAX_HISTORY_ITEMS);
      storageService.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
    } catch {
      console.error('Failed to save watch history');
    }
  };

  // ── Player selection ───────────────────────────────────────────────────────

  function getPlayer() {
    if (Platform.OS === "ios" && currentPlayerType === "ksplayer") {
      return require("../../components/ksplayer").MediaPlayer;
    }
    return require("../../components/nativeplayer").MediaPlayer;
  }

  const Player = getPlayer();

  // ── Loading UI ─────────────────────────────────────────────────────────────

  if (isLoadingStream) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          {artwork && <Image source={{ uri: artwork }} style={styles.backdropImage} />}
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading stream. Please wait...
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }

  // ── Player ─────────────────────────────────────────────────────────────────

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Player
        videoUrl={videoUrl}
        isTorrent={isTorrent}
        title={title as string}
        back={handleBack}
        progress={progress}
        artwork={artwork}
        subtitles={subtitles}
        openSubtitlesClient={openSubtitlesClient}
        isLoadingSubtitles={isLoadingSubtitles}
        updateProgress={handleUpdateProgress}
        onPlaybackError={handlePlaybackError}
        streams={streams}
        currentStreamIndex={currentStreamIndex}
        onStreamChange={handleStreamChange}
        onForceSwitchToKSPlayer={() => { setCurrentPlayerType("ksplayer"); setHasTriedNative(true); }}
        tvShow={
          type === 'series' && imdbid && season && episode
            ? { imdbId: imdbid as string, season: parseInt(season as string, 10), episode: parseInt(episode as string, 10) }
            : undefined
        }
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdropImage: { position: 'absolute', width: '100%', height: '100%', resizeMode: 'cover', opacity: 0.5 },
  loadingOverlay: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 20, fontSize: 16, fontWeight: '500' },
});

export default MediaPlayerScreen;