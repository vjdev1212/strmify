import React, { useEffect, useState, useCallback } from 'react';
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
import StatusModal from '@/components/StatusModal';
import { extractQuality, extractSize, getStreamType } from '@/utils/StreamItem';
import { StorageKeys, storageService } from '@/utils/StorageService';

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

    // Existing state
    const [addons, setAddons] = useState<Addon[]>([]);
    const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter();
    const { showActionSheetWithOptions } = useActionSheet();

    // Stremio server state
    const [stremioServers, setStremioServers] = useState<ServerConfig[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [players, setPlayers] = useState<{ name: string; scheme: string; encodeUrl: boolean }[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [playBtnDisabled, setPlayBtnDisabled] = useState<boolean>(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedStream, setSelectedStream] = useState<Stream | null>(null);

    const fetchServerConfigs = useCallback(async () => {
        try {
            const storedServers = await storageService.getItem(SERVERS_KEY);
            let stremioServerList: ServerConfig[] = [];

            if (!storedServers) {
                // Create default Stremio server
                const defaultStremio: ServerConfig = {
                    serverId: `stremio-default`,
                    serverType: 'stremio',
                    serverName: 'Stremio',
                    serverUrl: DEFAULT_STREMIO_URL,
                    current: true
                };
                stremioServerList = [defaultStremio];
            } else {
                const allServers: ServerConfig[] = JSON.parse(storedServers);
                // Filter only Stremio servers
                const filteredStremioServers = allServers.filter(server => server.serverType === 'stremio');

                stremioServerList = filteredStremioServers.length > 0 ? filteredStremioServers : [{
                    serverId: `stremio-default`,
                    serverType: 'stremio',
                    serverName: 'Stremio',
                    serverUrl: DEFAULT_STREMIO_URL,
                    current: true
                }];
            }

            setStremioServers(stremioServerList);

            // Set default server ID
            if (stremioServerList.length > 0) {
                const currentServer = stremioServerList.find(server => server.current);
                setSelectedServerId(currentServer ? currentServer.serverId : stremioServerList[0].serverId);
            }

        } catch (error) {
            console.error('Error loading server configurations:', error);
            showAlert('Error', 'Failed to load server configurations');
        }
    }, []);

    // Load saved default player from config
    const loadDefaultPlayer = async () => {
        try {
            const savedDefault = await storageService.getItem(DEFAULT_MEDIA_PLAYER_KEY);
            if (savedDefault) {
                const defaultPlayerName = JSON.parse(savedDefault);
                setSelectedPlayer(defaultPlayerName);
                return defaultPlayerName;
            }
            return null;
        } catch (error) {
            console.error('Error loading default player:', error);
            return null;
        }
    };

    useEffect(() => {
        const loadPlayers = async () => {
            const platformPlayers = getPlatformSpecificPlayers();
            setPlayers(platformPlayers);

            // Load saved default player or use first available
            const savedPlayer = await loadDefaultPlayer();
            if (!savedPlayer && platformPlayers.length > 0) {
                setSelectedPlayer(platformPlayers[0].name);
            }
        };

        const initializeData = async () => {
            await fetchServerConfigs();
            await loadPlayers();
            await fetchAddons();
        };

        initializeData();
    }, [fetchServerConfigs]);

    useEffect(() => {
        if (stremioServers.length > 0) {
            const currentServer = stremioServers.find(server => server.current);
            const newServerId = currentServer ? currentServer.serverId : stremioServers[0].serverId;
            setSelectedServerId(newServerId);
        }
    }, [stremioServers]);

    // Helper function to get magnet link from stream (for copy/open actions only)
    const getMagnetFromStream = (stream: Stream): string | null => {
        const { magnet, magnetLink, infoHash } = stream;

        // For copy/open actions, prefer full magnet links with metadata
        if (magnet) return magnet;
        if (magnetLink) return magnetLink;

        // Convert infoHash to basic magnet link as fallback
        if (infoHash) {
            return convertInfoHashToMagnet(infoHash);
        }

        return null;
    };

    // Helper function to extract infoHash from stream (for Stremio playback only)
    const getInfoHashFromStream = (stream: Stream): string | null => {
        const { infoHash, magnet, magnetLink } = stream;

        // For Stremio playback, prefer existing infoHash for direct processing
        if (infoHash) return infoHash;

        // Extract infoHash from magnet links as fallback
        const magnetToUse = magnet || magnetLink;
        if (magnetToUse) {
            const match = magnetToUse.match(/xt=urn:btih:([a-fA-F0-9]{40}|[a-fA-F0-9]{32})/i);
            if (match) return match[1];
        }

        return null;
    };

    const generatePlayerUrlWithInfoHash = async (infoHash: string, serverUrl: string) => {
        try {
            setStatusText('Torrent details sent to the server. This may take a moment. Please wait...');
            return await generateStremioPlayerUrl(infoHash, serverUrl, type, season as string, episode as string);
        } catch (error) {
            console.error('Error generating player URL:', error);
            throw error;
        }
    };

    const handleCancel = () => {
        setPlayBtnDisabled(false);
        setModalVisible(false);
        setStatusText('');
        setIsPlaying(false);
    };

    // Modified handlePlay to work with Stremio only
    const handlePlay = async (stream: Stream, playerName?: string, forceServerId?: string) => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (isPlaying) {
            return;
        }

        const { url } = stream;
        const infoHash = getInfoHashFromStream(stream);
        const playerToUse = playerName || selectedPlayer;
        const serverIdToUse = forceServerId || selectedServerId;

        setIsPlaying(true);
        setPlayBtnDisabled(true);
        setModalVisible(true);
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        if (!playerToUse || (!url && !serverIdToUse)) {
            console.error('Missing player or server:', { playerToUse, url, serverIdToUse });
            setStatusText('Error: Please select a media player and server.');
            showAlert('Error', 'Please select a media player and server.');
            setPlayBtnDisabled(false);
            setModalVisible(false);
            setIsPlaying(false);
            return;
        }

        const selectedServer = stremioServers.find(s => s.serverId === serverIdToUse);
        console.log('Selected server:', selectedServer);

        if (!selectedServer && !url && infoHash) {
            console.error('No Stremio server found for infoHash processing');
            setStatusText('Error: Stremio server configuration not found.');
            showAlert('Error', 'Stremio server configuration not found. Please try again.');
            setPlayBtnDisabled(false);
            setModalVisible(false);
            setIsPlaying(false);
            return;
        }

        const player = players.find((p) => p.name === playerToUse);

        if (!player) {
            console.error('Player not found:', playerToUse);
            setStatusText('Error: Invalid media player selection.');
            showAlert('Error', 'Invalid media player selection.');
            setPlayBtnDisabled(false);
            setModalVisible(false);
            setIsPlaying(false);
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
                console.error('No video URL generated');
                setStatusText('Error: Unable to generate a valid video URL.');
                showAlert('Error', 'Unable to generate a valid video URL.');
                setPlayBtnDisabled(false);
                setModalVisible(false);
                setIsPlaying(false);
                return;
            }

            console.log('Url before encoding', videoUrl);
            const urlJs = new URL(videoUrl);
            const filename = urlJs?.pathname?.split('/')?.pop() || '';
            const streamUrl = player.encodeUrl ? encodeURIComponent(videoUrl) : videoUrl;
            const playerUrl = player.scheme.replace('STREAMURL', streamUrl)?.replace('STREAMTITLE', filename);
            console.log('Final Player URL', playerUrl);

            if (playerUrl) {
                if (playerToUse === Players.Default) {
                    router.push({
                        pathname: '/stream/player',
                        params: {
                            videoUrl: playerUrl,
                            title: contentTitle,
                            imdbid: imdbid,
                            type: type,
                            season: season,
                            episode: episode
                        },
                    });
                } else {
                    setStatusText('Opening Stream in Media Player...');
                    await Linking.openURL(playerUrl);
                    setStatusText('Stream Opened in Media Player...');
                }
            }
        } catch (error) {
            console.error('Error during playback process:', error);
            setStatusText('Error: An error occurred while trying to play the stream.');
            showAlert('Error', 'An error occurred while trying to play the stream.');
        } finally {
            setPlayBtnDisabled(false);
            setModalVisible(false);
            setIsPlaying(false);
        }
    };

    const fetchAddons = async (): Promise<void> => {
        try {
            setLoading(true);

            const storedAddons = await storageService.getItem(ADDONS_KEY);
            if (!storedAddons) {
                setAddons([]);
                setLoading(false);
                return;
            }

            const addonsData = JSON.parse(storedAddons) as Record<string, Addon>;
            if (!addonsData || Object.keys(addonsData).length === 0) {
                setAddons([]);
                setLoading(false);
                return;
            }

            const addonList = Object.values(addonsData);
            const filteredAddons = addonList.filter((addon: Addon) => {
                return addon?.types && addon.types.includes(type);
            });

            setAddons(filteredAddons);

            if (filteredAddons.length > 0) {
                const firstAddon = filteredAddons[0];
                setSelectedAddon(firstAddon);
                await fetchStreams(firstAddon);
            }
        } catch (error) {
            console.error('Error fetching addons:', error);
            showAlert('Error', 'Failed to load addons');
            setAddons([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStreams = async (addon: Addon): Promise<void> => {
        setLoading(true);

        try {
            const addonUrl = addon?.url || '';
            const streamBaseUrl = addon?.streamBaseUrl || addonUrl;
            let streamUrl = '';

            if (type === 'series') {
                streamUrl = `${streamBaseUrl}/stream/series/${imdbid}${season && episode ? `:${season}:${episode}` : ''}.json`;
            } else {
                streamUrl = `${streamBaseUrl}/stream/${type}/${imdbid}.json`;
            }

            const response = await fetch(streamUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json() as StreamResponse;
            setStreams(data.streams || []);
        } catch (error) {
            console.error('Error fetching streams:', error);
            setStreams([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddonPress = async (item: Addon): Promise<void> => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setSelectedAddon(item);
        fetchStreams(item);
    };

    const handleStreamSelected = async (stream: Stream): Promise<void> => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        const { embed, url } = stream;
        const infoHash = getInfoHashFromStream(stream);

        if (embed) {
            router.push({ pathname: '/stream/embed', params: { url: embed } });
            return;
        }

        // Keep in state for later reuse
        setSelectedStream(stream);

        if (!url && infoHash) {
            showTorrentActions(stream);
        } else {
            // Check if we have a default player configured
            if (selectedPlayer) {
                // Use the configured default player directly
                handlePlay(stream, selectedPlayer);
            } else {
                // No default player, show selection
                showPlayerSelection(undefined, stream);
            }
        }
    };

    const convertInfoHashToMagnet = (infoHash: string) => {
        return `magnet:?xt=urn:btih:${infoHash}`;
    };

    const copyToClipboard = async (text: string) => {
        try {
            await Clipboard.setStringAsync(text);
            showAlert('Success', 'Copied to clipboard');
        } catch (error) {
            console.error('Failed to copy:', error);
            showAlert('Error', 'Failed to copy to clipboard');
        }
    };

    const openInBrowser = async (url: string) => {
        try {
            await Linking.openURL(url);
        } catch (error) {
            console.error('Failed to open URL:', error);
            showAlert('Error', 'Failed to open in browser');
        }
    };

    const showTorrentActions = (stream: Stream) => {
        // Check if any Stremio servers are available
        if (stremioServers.length === 0) {
            showAlert('Error', 'No Stremio servers are configured');
            return;
        }

        // Get the current server name to display
        const currentServer = stremioServers.find(server => server.serverId === selectedServerId);
        const serverId = currentServer?.serverId || stremioServers[0].serverId;

        const { url } = stream;
        let linkToUse = url || '';

        // Get magnet link from stream (handles infoHash, magnet, magnetLink)
        if (!url) {
            const magnetLink = getMagnetFromStream(stream);
            if (magnetLink) {
                linkToUse = magnetLink;
            }
        }

        // Show action sheet with current server and additional options
        const serverOptions = [
            'Play',
            'Copy',
            'Open with App',
            'Cancel'
        ];
        const cancelButtonIndex = 3;

        showActionSheetWithOptions(
            {
                options: serverOptions,
                cancelButtonIndex,
                title: 'Select action',
                messageTextStyle: { color: '#ffffff', fontSize: 12 },
                textStyle: { color: '#ffffff' },
                titleTextStyle: { color: '#535aff', fontWeight: '500' },
                cancelButtonTintColor: '#ff6b6b',
                containerStyle: { backgroundColor: '#101010' },
                userInterfaceStyle: 'dark',
                icons: [
                    <Feather name="play" size={20} color="#ffffff" />,
                    <Feather name="copy" size={20} color="#ffffff" />,
                    <Feather name="external-link" size={20} color="#ffffff" />,
                    <Feather name="x" size={20} color="#ff6b6b" />
                ]
            },
            (selectedIndex?: number) => {
                if (selectedIndex !== undefined && selectedIndex !== cancelButtonIndex) {
                    switch (selectedIndex) {
                        case 0:
                            setSelectedServerId(serverId);
                            setTimeout(() => {
                                // Check if we have a default player configured
                                if (selectedPlayer) {
                                    // Use the configured default player directly
                                    handlePlay(stream, selectedPlayer, serverId);
                                } else {
                                    // No default player, show selection
                                    showPlayerSelection(serverId, stream);
                                }
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
            }
        );
    };

    const showPlayerSelection = (selectedServerIdParam?: string, stream?: Stream) => {
        const playerOptions = players.map(player => player.name);
        playerOptions.push('Cancel');

        const cancelButtonIndex = playerOptions.length - 1;

        showActionSheetWithOptions(
            {
                options: playerOptions,
                cancelButtonIndex,
                title: 'Media Player',
                message: 'Select the Media Player for Streaming',
                messageTextStyle: { color: '#ffffff', fontSize: 12 },
                textStyle: { color: '#ffffff' },
                titleTextStyle: { color: '#535aff', fontWeight: '500' },
                containerStyle: { backgroundColor: '#101010' },
                userInterfaceStyle: 'dark'
            },
            (selectedIndex?: number) => {
                if (selectedIndex !== undefined && selectedIndex !== cancelButtonIndex) {
                    const selectedPlayerName = players[selectedIndex].name;

                    setSelectedPlayer(selectedPlayerName);
                    if (stream) {
                        console.log('Starting playback with server info:', {
                            selectedServerIdParam
                        });
                        handlePlay(stream, selectedPlayerName, selectedServerIdParam);
                    }
                }
            }
        );
    };

    interface AddonItemProps {
        item: Addon;
    }

    const RenderAddonItem = ({ item }: AddonItemProps): React.ReactElement | null => {
        const { name, types } = item;

        if (!types || !types.includes(type)) {
            return null;
        }

        const isSelected = item.name === selectedAddon?.name;
        return (
            <Pressable
                style={[
                    styles.addonItem,
                    isSelected && styles.selectedAddonItem,
                ]}
                onPress={() => handleAddonPress(item)}
            >
                <Text
                    style={[
                        styles.addonName,
                        isSelected && styles.selectedaddonName,
                    ]}
                    numberOfLines={1}
                >
                    {name}
                </Text>
            </Pressable>
        );
    };

    interface StreamItemProps {
        item: Stream;
    }

    const RenderStreamItem = ({ item }: StreamItemProps): React.ReactElement => {
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
                            {size && (
                                <Text style={styles.streamSize}>{size}</Text>
                            )}
                            <Text style={styles.streamType}>
                                {streamType}
                            </Text>
                        </RNView>
                    </RNView>
                </Card>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            {
                loading && addons.length === 0 ? (
                    <RNView style={styles.loadingContainer}>
                        <View style={styles.centeredContainer}>
                            <ActivityIndicator size="large" style={styles.activityIndicator} color="#535aff" />
                            <Text style={styles.loadingText}>Loading addons...</Text>
                        </View>
                    </RNView>
                ) : addons?.length > 0 ? (
                    <View style={{
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderColor: 'rgba(255,255,255, 0.05)'
                    }}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.addonListContainer}>
                            {
                                addons.map((item, index) => (
                                    <RenderAddonItem key={`addon-${index}-${item.name}`} item={item} />
                                ))
                            }
                        </ScrollView>
                    </View>
                ) : (
                    <RNView style={styles.loadingContainer}>
                        <View style={styles.centeredContainer}>
                            <Feather style={styles.noAddons} name='alert-circle' color="#ffffff" size={70} />
                            <Text style={[styles.noAddonsText]}>
                                No addons have been found. Please ensure that you have configured the addons before searching.
                            </Text>
                        </View>
                    </RNView>
                )
            }
            {
                loading && addons.length > 0 ? (
                    <RNView style={styles.loadingContainer}>
                        <View style={styles.centeredContainer}>
                            <ActivityIndicator size="large" style={styles.activityIndicator} color="#535aff" />
                            <Text style={styles.loadingText}>Loading streams...</Text>
                        </View>
                    </RNView>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                        <View style={styles.streamsContainer}>
                            {
                                streams.length > 0 ? (
                                    streams.map((item, index) => (
                                        <RenderStreamItem key={`stream-${index}-${item.name}`} item={item} />
                                    ))
                                ) : (
                                    <>
                                        {
                                            addons.length > 0 && (
                                                <View style={styles.centeredContainer}>
                                                    <Feather style={styles.noStreams} name='alert-circle' color="#535aff" size={50} />
                                                    <Text style={[styles.noStreamsText]}>
                                                        No streams found!
                                                    </Text>
                                                </View>
                                            )
                                        }
                                    </>
                                )
                            }
                        </View>
                    </ScrollView>
                )
            }
            <BottomSpacing space={30} />

            <StatusModal
                visible={isModalVisible}
                statusText={statusText}
                onCancel={handleCancel}
            />
        </SafeAreaView >
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
    addonListContainer: {
        marginVertical: 15,
        marginHorizontal: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    addonList: {
        paddingHorizontal: 10,
    },
    addonItem: {
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginHorizontal: 5,
        backgroundColor: '#101010',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#333',
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
        shadowOffset: {
            width: 0,
            height: 2,
        },
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
    streamIconContainer: {
        padding: 4,
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
    centeredText: {
        fontSize: 18,
        textAlign: 'center',
        color: '#ffffff',
    },
    noStreams: {
        marginTop: -50,
        paddingBottom: 20
    },
    noStreamsText: {
        fontSize: 16,
        textAlign: 'center',
        marginHorizontal: '10%',
        color: '#fff'
    },
    noAddons: {
        marginTop: 100,
        paddingBottom: 20
    },
    noAddonsText: {
        fontSize: 16,
        textAlign: 'center',
        marginHorizontal: '10%',
        color: '#fff'
    }
});

export default StreamListScreen;