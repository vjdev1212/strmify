import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Pressable, View as RNView, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import { ActivityIndicator, Card, StatusBar, Text, View } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported, showAlert, getOriginalPlatform } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { generateStremioPlayerUrl } from '@/clients/stremio';
import { generateTorrServerPlayerUrl } from '@/clients/torrserver';
import { ServerConfig } from '@/components/ServerConfig';
import { Linking } from 'react-native';

interface Stream {
    name: string;
    title?: string;
    url?: string;
    embed?: string;
    infoHash?: string;
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

enum Servers {
    Stremio = 'stremio',
    TorrServer = 'torrserver',
    Cancel = 'cancel',
}

enum Players {
    Default = 'Default',
    Browser = 'Browser',
    VLC = 'VLC',
    Infuse = 'Infuse',
    VidHub = 'VidHub',
    MXPlayer = "MX Player",
    MXPlayerPro = "MX PRO",
    OutPlayer = 'OutPlayer'
}

const DEFAULT_STREMIO_URL = 'https://127.0.0.1:12470';
const DEFAULT_TORRSERVER_URL = 'https://127.0.0.1:5665';
const STORAGE_KEY = 'defaultMediaPlayer';

// Environment variable checks
const ENABLE_STREMIO = process.env.EXPO_PUBLIC_ENABLE_STREMIO === 'true';
const ENABLE_TORRSERVER = process.env.EXPO_PUBLIC_ENABLE_TORRSERVER === 'true';

const StreamListScreen = () => {
    const { imdbid, type, name: contentTitle, season, episode, colors } = useLocalSearchParams<{
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

    // New state for server and player logic
    const [serversMap, setServersMap] = useState<{ [key: string]: ServerConfig[] }>({
        [Servers.Stremio]: [],
        [Servers.TorrServer]: [],
        [Servers.Cancel]: [],
    });
    const [serverType, setServerType] = useState<string>(Servers.Stremio);
    const [players, setPlayers] = useState<{ name: string; scheme: string; encodeUrl: boolean }[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [playBtnDisabled, setPlayBtnDisabled] = useState<boolean>(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedStream, setSelectedStream] = useState<Stream | null>(null);

    // Get enabled servers based on environment variables
    const getEnabledServers = useCallback(() => {
        const enabledServers: string[] = [];
        if (ENABLE_STREMIO) enabledServers.push(Servers.Stremio);
        if (ENABLE_TORRSERVER) enabledServers.push(Servers.TorrServer);
        return enabledServers;
    }, []);

    const loadDefaultPlayer = async () => {
        try {
            const savedDefault = await AsyncStorage.getItem(STORAGE_KEY);
            if (savedDefault) {
                const defaultPlayerName = JSON.parse(savedDefault);
                return defaultPlayerName;
            }
        } catch (error) {
            console.error('Error loading default player:', error);
        }
        return null;
    };

    const getPlatformSpecificPlayers = () => {
        if (getOriginalPlatform() === 'android') {
            return [
                { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false },
                { name: Players.VLC, scheme: 'vlc://STREAMURL', encodeUrl: false },
                { name: Players.MXPlayer, scheme: 'intent:STREAMURL?sign=Yva5dQp8cFQpVAMUh1QxNWbZAZ2h05lYQ4qAxqf717w=:0#Intent;package=com.mxtech.videoplayer.ad;S.title=STREAMTITLE;end', encodeUrl: false },
                { name: Players.MXPlayerPro, scheme: 'intent:STREAMURL?sign=Yva5dQp8cFQpVAMUh1QxNWbZAZ2h05lYQ4qAxqf717w=:0#Intent;package=com.mxtech.videoplayer.pro;S.title=STREAMTITLE;end', encodeUrl: false },
                { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=STREAMURL', encodeUrl: true },
            ];
        } else if (getOriginalPlatform() === 'ios') {
            return [
                { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false },
                { name: Players.VLC, scheme: 'vlc://STREAMURL', encodeUrl: false },
                { name: Players.Infuse, scheme: 'infuse://x-callback-url/play?url=STREAMURL', encodeUrl: true },
                { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=STREAMURL', encodeUrl: true },
                { name: Players.OutPlayer, scheme: 'outplayer://STREAMURL', encodeUrl: false },
            ];
        } else if (getOriginalPlatform() === 'web') {
            return [
                { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false }
            ];
        } else if (getOriginalPlatform() === 'windows') {
            return [
                { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false },
            ];
        } else if (getOriginalPlatform() === 'macos') {
            return [
                { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false },
                { name: Players.VLC, scheme: 'vlc://STREAMURL', encodeUrl: false },
                { name: Players.Infuse, scheme: 'infuse://x-callback-url/play?url=STREAMURL', encodeUrl: true },
                { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=STREAMURL', encodeUrl: true },
            ];
        }
        return [];
    };

    const fetchServerConfigs = useCallback(async () => {
        try {
            const enabledServers = getEnabledServers();
            
            if (enabledServers.length === 0) {
                console.warn('No servers are enabled in environment variables');
                showAlert('Error', 'No streaming servers are enabled');
                return;
            }

            const storedServers = await AsyncStorage.getItem('servers');
            let newServersMap: { [key: string]: ServerConfig[] } = {
                [Servers.Stremio]: [],
                [Servers.TorrServer]: [],
            };

            if (!storedServers) {
                // Create default servers only for enabled ones
                if (ENABLE_STREMIO) {
                    const defaultStremio: ServerConfig = {
                        serverId: `stremio-default`,
                        serverType: Servers.Stremio,
                        serverName: 'Stremio',
                        serverUrl: DEFAULT_STREMIO_URL,
                        current: true
                    };
                    newServersMap[Servers.Stremio] = [defaultStremio];
                }

                if (ENABLE_TORRSERVER) {
                    const defaultTorrServer: ServerConfig = {
                        serverId: `torrserver-default`,
                        serverType: Servers.TorrServer,
                        serverName: 'TorrServer',
                        serverUrl: DEFAULT_TORRSERVER_URL,
                        current: true
                    };
                    newServersMap[Servers.TorrServer] = [defaultTorrServer];
                }
            } else {
                const allServers: ServerConfig[] = JSON.parse(storedServers);
                
                // Filter servers based on enabled ones
                if (ENABLE_STREMIO) {
                    const stremioServers = allServers.filter(server => server.serverType === Servers.Stremio);
                    newServersMap[Servers.Stremio] = stremioServers.length > 0 ? stremioServers : [{
                        serverId: `stremio-default`,
                        serverType: Servers.Stremio,
                        serverName: 'Stremio',
                        serverUrl: DEFAULT_STREMIO_URL,
                        current: true
                    }];
                }

                if (ENABLE_TORRSERVER) {
                    const torrServerServers = allServers.filter(server => server.serverType === Servers.TorrServer);
                    newServersMap[Servers.TorrServer] = torrServerServers.length > 0 ? torrServerServers : [{
                        serverId: `torrserver-default`,
                        serverType: Servers.TorrServer,
                        serverName: 'TorrServer',
                        serverUrl: DEFAULT_TORRSERVER_URL,
                        current: true
                    }];
                }
            }

            setServersMap(newServersMap);

            // Set default server type and ID based on enabled servers
            if (ENABLE_STREMIO && newServersMap[Servers.Stremio].length > 0) {
                const stremioCurrentServer = newServersMap[Servers.Stremio].find(server => server.current);
                setServerType(Servers.Stremio);
                setSelectedServerId(stremioCurrentServer ? stremioCurrentServer.serverId : newServersMap[Servers.Stremio][0].serverId);
            } else if (ENABLE_TORRSERVER && newServersMap[Servers.TorrServer].length > 0) {
                const torrServerCurrentServer = newServersMap[Servers.TorrServer].find(server => server.current);
                setServerType(Servers.TorrServer);
                setSelectedServerId(torrServerCurrentServer ? torrServerCurrentServer.serverId : newServersMap[Servers.TorrServer][0].serverId);
            }

        } catch (error) {
            console.error('Error loading server configurations:', error);
            showAlert('Error', 'Failed to load server configurations');
        }
    }, [getEnabledServers]);

    useEffect(() => {
        const loadPlayers = async () => {
            const platformPlayers = getPlatformSpecificPlayers();
            setPlayers(platformPlayers);

            setSelectedPlayer(platformPlayers[0].name);
        };

        const initializeData = async () => {
            await fetchServerConfigs();
            await loadPlayers();
            await fetchAddons();
        };

        initializeData();
    }, [fetchServerConfigs]);

    useEffect(() => {
        console.log('=== SERVER CONFIG CHANGE ===');
        console.log('Server type changed to:', serverType);
        console.log('Available servers for type:', serversMap[serverType]);

        if (serversMap[serverType] && serversMap[serverType].length > 0) {
            const currentServer = serversMap[serverType].find(server => server.current);
            const newServerId = currentServer ? currentServer.serverId : serversMap[serverType][0].serverId;
            console.log('Setting selectedServerId to:', newServerId);
            setSelectedServerId(newServerId);
        }
    }, [serverType, serversMap]);

    const generatePlayerUrlWithInfoHash = async (infoHash: string, serverType: string, serverUrl: string) => {
        try {
            setStatusText('Torrent details sent to the server. This may take a moment. Please wait...');
            if (serverType === Servers.Stremio) {
                return await generateStremioPlayerUrl(infoHash, serverUrl, type, season as string, episode as string);
            }
            if (serverType === Servers.TorrServer) {
                const videoUrl = await generateTorrServerPlayerUrl(infoHash, serverUrl, type, season as string, episode as string);
                return videoUrl;
            }
            return '';
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

    // Modified handlePlay to accept optional server parameters and better validation
    const handlePlay = async (stream: Stream, playerName?: string, forceServerType?: string, forceServerId?: string) => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
        if (isPlaying) {
            return;
        }

        const { url, infoHash } = stream;
        const playerToUse = playerName || selectedPlayer;
        const serverTypeToUse = forceServerType || serverType;
        const serverIdToUse = forceServerId || selectedServerId;

        setIsPlaying(true);
        setPlayBtnDisabled(true);
        setModalVisible(true);
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }

        console.log('=== PLAY ATTEMPT ===');
        console.log('Using player:', playerToUse);
        console.log('Using server type:', serverTypeToUse);
        console.log('Using server ID:', serverIdToUse);
        console.log('Stream has URL:', !!url);
        console.log('Stream has infoHash:', !!infoHash);
        console.log('serversMap:', serversMap);

        if (!playerToUse || (!url && !serverIdToUse)) {
            console.error('Missing player or server:', { playerToUse, url, serverIdToUse });
            setStatusText('Error: Please select a media player and server.');
            showAlert('Error', 'Please select a media player and server.');
            setPlayBtnDisabled(false);
            setModalVisible(false);
            setIsPlaying(false);
            return;
        }

        const selectedServer = serversMap[serverTypeToUse]?.find(s => s.serverId === serverIdToUse);
        console.log('Selected server:', selectedServer);

        if (!selectedServer && !url && infoHash) {
            console.error('No server found for infoHash processing');
            setStatusText('Error: Server configuration not found.');
            showAlert('Error', 'Server configuration not found. Please try again.');
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
                console.log('Generating URL with:', { infoHash, serverType: selectedServer.serverType, serverUrl: selectedServer.serverUrl });
                videoUrl = await generatePlayerUrlWithInfoHash(infoHash, selectedServer.serverType, selectedServer.serverUrl);
                setStatusText('URL Generated...');
                console.log('Generated video URL:', videoUrl);
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
                            artwork: `https://images.metahub.space/background/medium/${imdbid}/img`
                        },
                    });
                } else {
                    setStatusText('Opening Stream in Media Player...');
                    console.log('Opening URL in external player:', playerUrl);
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

            const storedAddons = await AsyncStorage.getItem('addons');
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
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
        setSelectedAddon(item);
        fetchStreams(item);
    };

    const handleStreamSelected = async (stream: Stream): Promise<void> => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }

        const { embed, url, infoHash } = stream;

        if (embed) {
            router.push({ pathname: '/stream/embed', params: { url: embed } });
            return;
        }

        // Keep in state for later reuse
        setSelectedStream(stream);

        if (!url && infoHash) {
            showServerSelection(stream); // pass stream directly
        } else {
            showPlayerSelection(undefined, undefined, stream); // pass stream directly
        }
    };

    const showServerSelection = (stream: Stream) => {
        const enabledServers = getEnabledServers();
        
        // If no servers are enabled, show error
        if (enabledServers.length === 0) {
            showAlert('Error', 'No streaming servers are enabled');
            return;
        }

        // If only one server is enabled, auto-select it and proceed to player selection
        if (enabledServers.length === 1) {
            const selectedServerType = enabledServers[0];
            const servers = serversMap[selectedServerType];
            
            if (servers && servers.length > 0) {
                const currentServer = servers.find(server => server.current);
                const serverId = currentServer ? currentServer.serverId : servers[0].serverId;

                console.log('Auto-selecting single enabled server:', selectedServerType);
                console.log('Auto-selecting server ID:', serverId);

                setServerType(selectedServerType);
                setSelectedServerId(serverId);

                // Proceed directly to player selection
                setTimeout(() => {
                    showPlayerSelection(selectedServerType, serverId, stream);
                }, 100);
            } else {
                showAlert('Error', 'No servers configured for the enabled server type');
            }
            return;
        }

        // Multiple servers available, show action sheet
        const serverOptions: string[] = enabledServers.map(type =>
            type === 'stremio' ? 'Stremio' : 'TorrServer'
        );
        serverOptions.push('Cancel');

        const cancelButtonIndex = serverOptions.length - 1;

        showActionSheetWithOptions(            
            {                
                options: serverOptions,
                cancelButtonIndex,
                title: 'Server',
                message: 'Select the Server for Streaming',
                messageTextStyle: { color: '#ffffff', fontSize: 12 },
                textStyle: { color: '#ffffff' },
                titleTextStyle: { color: '#535aff', fontWeight: '500' },
                containerStyle: { backgroundColor: '#101010' },
                userInterfaceStyle: 'dark'
            },
            (selectedIndex?: number) => {
                if (selectedIndex !== undefined && selectedIndex !== cancelButtonIndex) {
                    const selectedServerType = enabledServers[selectedIndex];
                    console.log('Server selected:', selectedServerType);

                    const servers = serversMap[selectedServerType];
                    if (servers && servers.length > 0) {
                        const currentServer = servers.find(server => server.current);
                        const serverId = currentServer ? currentServer.serverId : servers[0].serverId;

                        console.log('Setting server type:', selectedServerType);
                        console.log('Setting server ID:', serverId);

                        setServerType(selectedServerType);
                        setSelectedServerId(serverId);

                        setTimeout(() => {
                            showPlayerSelection(selectedServerType, serverId, stream);
                        }, 300);
                    } else {
                        console.error('No servers found for type:', selectedServerType);
                        showAlert('Error', 'No servers configured for the selected type');
                    }
                }
            }
        );
    };

    const showPlayerSelection = (
        selectedServerType?: string,
        selectedServerIdParam?: string,
        stream?: Stream
    ) => {
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
                    console.log('Player selected from action sheet:', selectedPlayerName);

                    setSelectedPlayer(selectedPlayerName);

                    console.log('selected stream', stream);

                    if (stream) {
                        console.log('Starting playback with server info:', {
                            selectedServerType,
                            selectedServerIdParam
                        });
                        handlePlay(stream, selectedPlayerName, selectedServerType, selectedServerIdParam);
                    }
                }
            }
        );
    };

    const handleServerToggle = async (type: string) => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
        setServerType(type);
    };

    const handlePlayerSelect = async (playerName: string) => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
        setSelectedPlayer(playerName);
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

        return (
            <RNView style={[{
                marginHorizontal: 'auto',
                marginVertical: 10,
                justifyContent: 'space-evenly',
                width: '98%',
                maxWidth: 380,
                alignSelf: 'center'
            }]}>
                <Pressable onPress={() => handleStreamSelected(item)}>
                    <Card style={styles.streamItem}>
                        <Text style={styles.streamName} numberOfLines={2}>
                            {name}
                        </Text>
                        <Text style={styles.streamTitle}>
                            {title || description}
                        </Text>
                    </Card>
                </Pressable>
            </RNView>
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
                    <View>
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
                            <ActivityIndicator size="large" style={styles.activityIndicator} color="#ffffff" />
                            <Text style={styles.loadingText}>Loading streams...</Text>
                        </View>
                    </RNView>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
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
                                                    <Feather style={styles.noStreams} name='alert-circle' color="#ffffff" size={50} />
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

            {/* Status Modal */}
            <Modal
                transparent={true}
                visible={isModalVisible}
                animationType="fade"
                onRequestClose={handleCancel}
            >
                <TouchableWithoutFeedback>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <ActivityIndicator size="large" color="#ffffff" style={styles.activityIndicator} />
                            <Text style={styles.modalText}>{statusText}</Text>
                            <Pressable style={styles.cancelButton} onPress={handleCancel}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 40
    },
    addonListContainer: {
        marginVertical: 20,
        marginHorizontal: '5%',
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
    },
    selectedAddonItem: {
        backgroundColor: '#535aff'
    },
    addonName: {
        fontSize: 15,
    },
    selectedaddonName: {
        color: '#fff',
    },
    streamsContainer: {
        flexGrow: 0,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-evenly',
    },
    streamItem: {
        paddingHorizontal: 10,
        paddingVertical: 20,
        marginVertical: 10,
        marginHorizontal: 20,
        borderRadius: 10,
        backgroundColor: '#111111'
    },
    streamName: {
        fontSize: 14,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    streamTitle: {
        fontSize: 13,
        paddingHorizontal: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityIndicator: {
        marginBottom: 10,
        color: '#ffffff',
    },
    loadingText: {
        fontSize: 16,
        marginTop: 10,
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
    },
    noStreams: {
        marginTop: 150,
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
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
    },
    modalContainer: {
        padding: 20,
        borderRadius: 10,
        minWidth: 250,
        maxWidth: 300,
        minHeight: 100,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111111'
    },
    modalText: {
        fontSize: 16,
        textAlign: 'center',
        marginVertical: 20,
        color: '#ffffff',
    },
    cancelButton: {
        marginVertical: 20,
        paddingVertical: 12,
        borderRadius: 30,
        alignItems: 'center',
        minWidth: 120,
        backgroundColor: '#535aff'
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: 500
    }
});

export default StreamListScreen;