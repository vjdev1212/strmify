import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, Pressable, View as RNView, ScrollView } from 'react-native';
import { ActivityIndicator, Card, StatusBar, Text, View } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { generateStremioPlayerUrl } from '@/clients/stremio';
import { ServerConfig } from '@/components/ServerConfig';
import { Linking } from 'react-native';
import BottomSpacing from '@/components/BottomSpacing';
import { getPlatformSpecificPlayers, Players } from '@/utils/MediaPlayer';
import { extractQuality, extractSize, getStreamType } from '@/utils/StreamItem';
import { StorageKeys, storageService } from '@/utils/StorageService';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

interface Addon {
    name: string;
    url?: string;
    streamBaseUrl?: string;
    types?: string[];
}

interface StreamResponse {
    streams?: Stream[];
}

const DEFAULT_STREMIO_URL = 'http://127.0.0.1:11470';
const DEFAULT_MEDIA_PLAYER_KEY = StorageKeys.DEFAULT_MEDIA_PLAYER_KEY;
const SERVERS_KEY = StorageKeys.SERVERS_KEY;
const ADDONS_KEY = StorageKeys.ADDONS_KEY;

const StreamListScreen = () => {
    const { imdbid, type, name: contentTitle, season, episode } = useLocalSearchParams<{
        imdbid: string;
        type: string;
        name: string;
        season?: string;
        episode?: string;
        colors?: string;
    }>();

    // State management
    const [addons, setAddons] = useState<Addon[]>([]);
    const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [stremioServers, setStremioServers] = useState<ServerConfig[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [players, setPlayers] = useState<{ name: string; scheme: string; encodeUrl: boolean }[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [playBtnDisabled, setPlayBtnDisabled] = useState<boolean>(false);
    const [statusText, setStatusText] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedStream, setSelectedStream] = useState<Stream | null>(null);

    // Bottom Sheet refs
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['40%', '60%'], []);

    // Refs for race condition prevention
    const abortControllerRef = useRef<AbortController | null>(null);
    const currentAddonRef = useRef<string>('');

    const router = useRouter();
    const { showActionSheetWithOptions } = useActionSheet();

    // Memoized server configuration fetcher
    const fetchServerConfigs = useCallback(async () => {
        try {
            const storedServers = await storageService.getItem(SERVERS_KEY);
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
            showAlert('Error', 'Failed to load server configurations');
        }
    }, []);

    // Optimized player loading
    const loadDefaultPlayer = useCallback(async () => {
        try {
            const savedDefault = await storageService.getItem(DEFAULT_MEDIA_PLAYER_KEY);
            return savedDefault ? JSON.parse(savedDefault) : null;
        } catch (error) {
            console.error('Error loading default player:', error);
            return null;
        }
    }, []);

    // Combined initialization effect
    useEffect(() => {
        const initializeApp = async () => {
            // Load platform players
            const platformPlayers = getPlatformSpecificPlayers();
            setPlayers(platformPlayers);

            // Load saved default player or use first available
            const savedPlayer = await loadDefaultPlayer();
            setSelectedPlayer(savedPlayer || (platformPlayers.length > 0 ? platformPlayers[0].name : null));

            // Fetch server configs and addons
            await fetchServerConfigs();
            await fetchAddons();
        };

        initializeApp();
    }, [fetchServerConfigs, loadDefaultPlayer]);

    // Stream utility functions
    const getMagnetFromStream = useCallback((stream: Stream): string | null => {
        const { magnet, magnetLink, infoHash } = stream;
        return magnet || magnetLink || (infoHash ? `magnet:?xt=urn:btih:${infoHash}` : null);
    }, []);

    const getInfoHashFromStream = useCallback((stream: Stream): string | null => {
        const { infoHash, magnet, magnetLink } = stream;
        if (infoHash) return infoHash;

        const magnetToUse = magnet || magnetLink;
        if (magnetToUse) {
            const match = magnetToUse.match(/xt=urn:btih:([a-fA-F0-9]{40}|[a-fA-F0-9]{32})/i);
            return match?.[1] || null;
        }
        return null;
    }, []);

    // Optimized stream URL generation
    const generatePlayerUrlWithInfoHash = useCallback(async (infoHash: string, serverUrl: string) => {
        setStatusText('Torrent details sent to the server. This may take a moment. Please wait...');
        return await generateStremioPlayerUrl(infoHash, serverUrl, type, season as string, episode as string);
    }, [type, season, episode]);

    // Bottom Sheet handlers
    const handleOpenBottomSheet = useCallback(() => {
        bottomSheetRef.current?.snapToIndex(1); // Snap to second snap point (35%)
    }, []);

    const handleCloseBottomSheet = useCallback(() => {
        bottomSheetRef.current?.close();
        setTimeout(() => {
            setPlayBtnDisabled(false);
            setStatusText('');
            setIsPlaying(false);
        }, 300);
    }, []);

    // Render backdrop for bottom sheet
    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    // Optimized play handler
    const handlePlay = useCallback(async (stream: Stream, playerName?: string, forceServerId?: string) => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        if (isPlaying) return;

        const { url } = stream;
        const infoHash = getInfoHashFromStream(stream);
        const playerToUse = playerName || selectedPlayer;
        const serverIdToUse = forceServerId || selectedServerId;

        setIsPlaying(true);
        setPlayBtnDisabled(true);        
        if (!url || infoHash) {
            handleOpenBottomSheet();
        }
        if (!playerToUse || (!url && !serverIdToUse)) {
            const errorMsg = 'Please select a media player and server.';
            setStatusText(`Error: ${errorMsg}`);
            showAlert('Error', errorMsg);
            handleCloseBottomSheet();
            return;
        }

        const selectedServer = stremioServers.find(s => s.serverId === serverIdToUse);
        const player = players.find(p => p.name === playerToUse);

        if (!selectedServer && !url && infoHash) {
            const errorMsg = 'Stremio server configuration not found. Please try again.';
            setStatusText(`Error: ${errorMsg}`);
            showAlert('Error', errorMsg);
            handleCloseBottomSheet();
            return;
        }

        if (!player) {
            const errorMsg = 'Invalid Media Player selection. Select Media Player from settings to proceed.';
            setStatusText(`Error: ${errorMsg}`);
            showAlert('Error', errorMsg);
            handleCloseBottomSheet();
            return;
        }

        try {
            let videoUrl = url || '';

            if (!url && infoHash && selectedServer) {
                setStatusText('Processing the InfoHash...');
                videoUrl = await generatePlayerUrlWithInfoHash(infoHash, selectedServer.serverUrl);
                setStatusText('URL Generated...');
            }

            if (!videoUrl) {
                const errorMsg = 'Unable to generate a valid video URL.';
                setStatusText(`Error: ${errorMsg}`);
                showAlert('Error', errorMsg);
                handleCloseBottomSheet();
                return;
            }

            const urlJs = new URL(videoUrl);
            const filename = urlJs.pathname.split('/').pop() || '';
            const streamUrl = player.encodeUrl ? encodeURIComponent(videoUrl) : videoUrl;
            const playerUrl = player.scheme.replace('STREAMURL', streamUrl).replace('STREAMTITLE', filename);

            if (playerToUse === Players.Default) {
                router.push({
                    pathname: '/stream/player',
                    params: {
                        videoUrl: playerUrl,
                        title: contentTitle,
                        imdbid,
                        type,
                        season,
                        episode
                    },
                });
                handleCloseBottomSheet();
            } else {
                setStatusText('Opening Stream in Media Player...');
                await Linking.openURL(playerUrl);
                setStatusText('Stream Opened in Media Player...');
                setTimeout(() => {
                    handleCloseBottomSheet();
                }, 1000);
            }
        } catch (error) {
            console.error('Error during playback process:', error);
            const errorMsg = 'An error occurred while trying to play the stream. Please check the server and try again.';
            setStatusText(`Error: ${errorMsg}`);
            showAlert('Error', errorMsg);
        } finally {
            handleCloseBottomSheet();
        }
    }, [isPlaying, getInfoHashFromStream, selectedPlayer, selectedServerId, stremioServers, players, generatePlayerUrlWithInfoHash, handleCloseBottomSheet, handleOpenBottomSheet, router, contentTitle, imdbid, type, season, episode]);

    // Fixed addon fetching with race condition prevention
    const fetchAddons = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);

            const storedAddons = await storageService.getItem(ADDONS_KEY);
            if (!storedAddons) {
                setAddons([]);
                return;
            }

            const addonsData = JSON.parse(storedAddons) as Record<string, Addon>;
            if (!addonsData || Object.keys(addonsData).length === 0) {
                setAddons([]);
                return;
            }

            const addonList = Object.values(addonsData);
            const filteredAddons = addonList.filter((addon: Addon) => addon?.types?.includes(type));

            setAddons(filteredAddons);

            if (filteredAddons.length > 0) {
                const firstAddon = filteredAddons[0];
                setSelectedAddon(firstAddon);
                currentAddonRef.current = firstAddon.name;
                await fetchStreams(firstAddon);
            }
        } catch (error) {
            console.error('Error fetching addons:', error);
            showAlert('Error', 'Failed to load addons');
            setAddons([]);
        } finally {
            setLoading(false);
        }
    }, [type]);

    // Fixed stream fetching with abort controller
    const fetchStreams = useCallback(async (addon: Addon): Promise<void> => {
        // Abort previous request if it exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Clear streams immediately to prevent showing old data
        setStreams([]);
        setLoading(true);

        try {
            const addonUrl = addon?.url || '';
            const streamBaseUrl = addon?.streamBaseUrl || addonUrl;

            const streamUrl = type === 'series'
                ? `${streamBaseUrl}/stream/series/${imdbid}${season && episode ? `:${season}:${episode}` : ''}.json`
                : `${streamBaseUrl}/stream/${type}/${imdbid}.json`;

            const response = await fetch(streamUrl, { signal: controller.signal });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json() as StreamResponse;

            // Only update streams if this is still the current addon
            if (currentAddonRef.current === addon.name && !controller.signal.aborted) {
                setStreams(data.streams || []);
            }
        } catch (error: any) {
            // Only handle error if not aborted
            if (error.name !== 'AbortError') {
                console.error('Error fetching streams:', error);
                // Only clear streams if this is still the current addon
                if (currentAddonRef.current === addon.name) {
                    setStreams([]);
                }
            }
        } finally {
            // Only stop loading if this is still the current addon
            if (currentAddonRef.current === addon.name && !controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, [imdbid, type, season, episode]);

    // Optimized addon selection handler
    const handleAddonPress = useCallback(async (item: Addon): Promise<void> => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Update current addon reference immediately
        currentAddonRef.current = item.name;
        setSelectedAddon(item);

        // Fetch streams for the new addon
        await fetchStreams(item);
    }, [fetchStreams]);

    // Stream selection handler
    const handleStreamSelected = useCallback(async (stream: Stream): Promise<void> => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        const { url } = stream;
        const infoHash = getInfoHashFromStream(stream);

        setSelectedStream(stream);

        if (!url && infoHash) {
            showTorrentActions(stream);
        } else {
            selectedPlayer ? handlePlay(stream, selectedPlayer) : showPlayerSelection(undefined, stream);
        }
    }, [getInfoHashFromStream, selectedPlayer, handlePlay]);

    // Utility functions
    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await Clipboard.setStringAsync(text);
            showAlert('Success', 'Copied to clipboard');
        } catch (error) {
            console.error('Failed to copy:', error);
            showAlert('Error', 'Failed to copy to clipboard');
        }
    }, []);

    const openInBrowser = useCallback(async (url: string) => {
        try {
            await Linking.openURL(url);
            handleCloseBottomSheet();
        } catch (error) {
            console.error('Failed to open URL:', error);
            showAlert('Error', 'Failed to open in browser');
        }
    }, []);

    // Action sheet handlers
    const showTorrentActions = useCallback((stream: Stream) => {
        if (stremioServers.length === 0) {
            showAlert('Error', 'No Stremio servers are configured');
            return;
        }

        const currentServer = stremioServers.find(server => server.serverId === selectedServerId);
        const serverId = currentServer?.serverId || stremioServers[0].serverId;
        const { url } = stream;
        let linkToUse = url || getMagnetFromStream(stream) || '';

        const options = ['Play', 'Copy', 'Open with App', 'Cancel'];
        const icons = [
            <Feather name="play" size={20} color="#ffffff" />,
            <Feather name="copy" size={20} color="#ffffff" />,
            <Feather name="external-link" size={20} color="#ffffff" />,
            <Feather name="x" size={20} color="#ff6b6b" />
        ];

        showActionSheetWithOptions(
            {
                options,
                cancelButtonIndex: 3,
                title: 'Select action',
                messageTextStyle: { color: '#ffffff', fontSize: 12 },
                textStyle: { color: '#ffffff' },
                titleTextStyle: { color: '#535aff', fontWeight: '500' },
                cancelButtonTintColor: '#ff6b6b',
                containerStyle: { backgroundColor: '#101010' },
                userInterfaceStyle: 'dark',
                icons
            },
            (selectedIndex?: number) => {
                if (selectedIndex === undefined || selectedIndex === 3) return;

                switch (selectedIndex) {
                    case 0:
                        setSelectedServerId(serverId);
                        setTimeout(() => {
                            selectedPlayer
                                ? handlePlay(stream, selectedPlayer, serverId)
                                : showPlayerSelection(serverId, stream);
                        }, 100);
                        break;
                    case 1:
                        copyToClipboard(linkToUse);
                        break;
                    case 2:
                        openInBrowser(linkToUse);
                        break;
                }
            }
        );
    }, [stremioServers, selectedServerId, getMagnetFromStream, selectedPlayer, handlePlay, copyToClipboard, openInBrowser, showActionSheetWithOptions]);

    const showPlayerSelection = useCallback((selectedServerIdParam?: string, stream?: Stream) => {
        const playerOptions = [...players.map(player => player.name), 'Cancel'];

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
                if (selectedIndex === undefined || selectedIndex === playerOptions.length - 1) return;

                const selectedPlayerName = players[selectedIndex].name;
                setSelectedPlayer(selectedPlayerName);

                if (stream) {
                    handlePlay(stream, selectedPlayerName, selectedServerIdParam);
                }
            }
        );
    }, [players, handlePlay, showActionSheetWithOptions]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Memoized components
    const AddonItem = React.memo<{ item: Addon }>(({ item }) => {
        if (!item.types?.includes(type)) return null;

        const isSelected = item.name === selectedAddon?.name;
        return (
            <Pressable
                style={[styles.addonItem, isSelected && styles.selectedAddonItem]}
                onPress={() => handleAddonPress(item)}
            >
                <Text style={[styles.addonName, isSelected && styles.selectedaddonName]} numberOfLines={1}>
                    {item.name}
                </Text>
            </Pressable>
        );
    });

    const StreamItem = React.memo<{ item: Stream }>(({ item }) => {
        const { name, title, description } = item;
        const quality = extractQuality(name, title);
        const size = extractSize(description || title || '');
        const streamType = getStreamType(item);

        return (
            <Pressable onPress={() => handleStreamSelected(item)} style={styles.streamContainer}>
                <Card style={styles.streamItem}>
                    <RNView style={styles.streamHeader}>
                        <RNView style={styles.streamTitleContainer}>
                            <Text style={styles.streamName} numberOfLines={2}>
                                {name}
                            </Text>
                            {quality && (
                                <RNView style={styles.qualityBadge}>
                                    <Text style={styles.qualityText}>{quality}</Text>
                                </RNView>
                            )}
                        </RNView>
                    </RNView>

                    {(title || description) && (
                        <Text style={styles.streamDescription} numberOfLines={5}>
                            {title || description}
                        </Text>
                    )}

                    <RNView style={styles.streamFooter}>
                        <RNView style={styles.streamMetadata}>
                            {size && <Text style={styles.streamSize}>{size}</Text>}
                            <Text style={styles.streamType}>{streamType}</Text>
                        </RNView>
                    </RNView>
                </Card>
            </Pressable>
        );
    });

    // Render helpers
    const renderLoadingState = (message: string) => (
        <RNView style={styles.loadingContainer}>
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" style={styles.activityIndicator} color="#535aff" />
                <Text style={styles.loadingText}>{message}</Text>
            </View>
        </RNView>
    );

    const renderEmptyState = (icon: string, message: string, topMargin = 0) => (
        <RNView style={styles.loadingContainer}>
            <View style={styles.centeredContainer}>
                <Feather
                    style={[topMargin ? { marginTop: topMargin } : undefined, { paddingBottom: 20 }]}
                    name={icon as any}
                    color={'#535aff'}
                    size={50}
                />
                <Text style={styles.noAddonsText}>{message}</Text>
            </View>
        </RNView>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <StatusBar />

                {loading && addons.length === 0 ? (
                    renderLoadingState('Loading addons...')
                ) : addons.length > 0 ? (
                    <View style={styles.addonBorderContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.addonListContainer}
                        >
                            {addons.map((item, index) => (
                                <AddonItem key={`${item.name}-${index}`} item={item} />
                            ))}
                        </ScrollView>
                    </View>
                ) : (
                    renderEmptyState('alert-circle', 'No addons have been found. Please ensure that you have configured the addons before searching.', 100)
                )}

                {loading && addons.length > 0 ? (
                    renderLoadingState('Loading streams...')
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                        <View style={styles.streamsContainer}>
                            {streams.length > 0 ? (
                                streams.map((item, index) => (
                                    <StreamItem key={`${item.name}-${index}`} item={item} />
                                ))
                            ) : (
                                addons.length > 0 && renderEmptyState('alert-circle', 'No streams found!', -50)
                            )}
                        </View>
                    </ScrollView>
                )}

                <BottomSpacing space={30} />

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
                            setPlayBtnDisabled(false);
                            setStatusText('');
                            setIsPlaying(false);
                        }
                    }}
                >
                    <BottomSheetView style={styles.bottomSheetContent}>
                        <RNView style={styles.statusContainer}>
                            <ActivityIndicator size="large" color="#535aff" style={styles.bottomSheetLoader} />
                            <Text style={styles.statusText}>{statusText}</Text>
                            <Pressable
                                style={styles.cancelButton}
                                onPress={handleCloseBottomSheet}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                        </RNView>
                    </BottomSheetView>
                </BottomSheet>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 40
    },
    scrollContainer: {
        paddingBottom: 20,
        maxWidth: 780,
        margin: 'auto',
        width: '100%'
    },
    addonBorderContainer: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255, 0.05)'
    },
    addonListContainer: {
        marginVertical: 15,
        marginHorizontal: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    addonItem: {
        borderRadius: 25,
        paddingVertical: 12,
        paddingHorizontal: 24,
        marginHorizontal: 10,
        backgroundColor: '#202020',
    },
    selectedAddonItem: {
        backgroundColor: 'rgba(83, 90, 255, 0.75)',
        borderColor: '#535aff',
    },
    addonName: {
        fontSize: 15,
        color: '#ffffff',
    },
    selectedaddonName: {
        color: '#fff',
        fontWeight: '500',
    },
    streamsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 40,
    },
    streamContainer: {
        marginBottom: 12,
    },
    streamItem: {
        backgroundColor: '#101010',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1a1a1a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    streamHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    streamTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingRight: 12,
    },
    streamName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#ffffff',
        flex: 1,
        lineHeight: 22,
    },
    qualityBadge: {
        backgroundColor: 'rgba(83, 90, 255, 0.25)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        marginLeft: 8,
        marginTop: 2,
    },
    qualityText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500'
    },
    streamDescription: {
        fontSize: 14,
        color: '#cccccc',
        lineHeight: 20,
        marginBottom: 12,
    },
    streamFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    streamMetadata: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    streamSize: {
        fontSize: 12,
        color: '#888',
        marginRight: 12,
        backgroundColor: '#2a2a2a',
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 4,
    },
    streamType: {
        fontSize: 12,
        color: '#666',
        textTransform: 'uppercase',
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityIndicator: {
        marginBottom: 10,
        color: '#535aff',
    },
    loadingText: {
        fontSize: 16,
        marginTop: 10,
        color: '#ffffff',
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noAddonsText: {
        fontSize: 16,
        textAlign: 'center',
        marginHorizontal: '10%',
        color: '#fff'
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

export default StreamListScreen;