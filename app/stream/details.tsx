import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, ScrollView, Pressable, Linking, Image, Modal, TouchableWithoutFeedback, SafeAreaView } from 'react-native';
import { ActivityIndicator, StatusBar, Text, View } from '@/components/Themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { generateStremioPlayerUrl } from '@/clients/stremio';
import { generateTorrServerPlayerUrl } from '@/clients/torrserver';
import { ServerConfig } from '@/components/ServerConfig';
import { getOriginalPlatform, isHapticsSupported, showAlert } from '@/utils/platform';
import { useColorScheme } from '@/components/useColorScheme';

enum Servers {
    Stremio = 'stremio',
    TorrServer = 'torrserver',
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

const StreamDetailsScreen = () => {
    const [serversMap, setServersMap] = useState<{ [key: string]: ServerConfig[] }>({
        [Servers.Stremio]: [],
        [Servers.TorrServer]: []
    });
    const [serverType, setServerType] = useState<string>(Servers.Stremio);
    const [players, setPlayers] = useState<{ name: string; scheme: string; encodeUrl: boolean; icon: any }[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [statusText, setStatusText] = useState('');
    const [metaData, setMetaData] = useState<any>(null);
    const [playBtnDisabled, setPlayBtnDisabled] = useState<boolean>(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const colorScheme = useColorScheme();

    useEffect(() => {
        const loadPlayers = async () => {
            const platformPlayers = getPlatformSpecificPlayers();
            setPlayers(platformPlayers);
            if (platformPlayers.length > 0) setSelectedPlayer(platformPlayers[0].name);
        };

        loadPlayers();
    }, []);

    const { imdbid, type, season, episode, contentTitle, name, title, description, url, infoHash } = useLocalSearchParams<{
        imdbid: string;
        type: string;
        season: string;
        episode: string;
        contentTitle: string;
        name: string;
        title: string;
        description?: string;
        url?: string;
        infoHash?: string;
    }>();

    const fetchContentData = useCallback(async () => {
        const stremioMetaDataUrl = `https://cinemeta-live.strem.io/meta/${type}/${imdbid}.json`;
        const metaDataResponse = await fetch(stremioMetaDataUrl);
        if (metaDataResponse.ok) {
            const data = await metaDataResponse.json();
            setMetaData(data.meta || null);
        }
    }, [imdbid, type]);

    const fetchServerConfigs = useCallback(async () => {
        try {
            const storedServers = await AsyncStorage.getItem('servers');
            if (!storedServers) {
                console.log('No server configuration found in AsyncStorage, using defaults');
                // Set default values if no servers are found
                const defaultStremio: ServerConfig = {
                    serverId: `stremio-default`,
                    serverType: Servers.Stremio,
                    serverName: 'Stremio',
                    serverUrl: DEFAULT_STREMIO_URL,
                    current: true
                };

                const defaultTorrServer: ServerConfig = {
                    serverId: `torrserver-default`,
                    serverType: Servers.TorrServer,
                    serverName: 'TorrServer',
                    serverUrl: DEFAULT_TORRSERVER_URL,
                    current: true
                };

                setServersMap({
                    [Servers.Stremio]: [defaultStremio],
                    [Servers.TorrServer]: [defaultTorrServer]
                });

                setServerType(Servers.Stremio);
                setSelectedServerId(defaultStremio.serverId);
                setLoading(false);
                return;
            }

            const allServers: ServerConfig[] = JSON.parse(storedServers);

            // Group servers by serverType
            const stremioServers = allServers.filter(server => server.serverType === Servers.Stremio);
            const torrServerServers = allServers.filter(server => server.serverType === Servers.TorrServer);

            // Set the servers map
            setServersMap({
                [Servers.Stremio]: stremioServers.length > 0 ? stremioServers : [{
                    serverId: `stremio-default`,
                    serverType: Servers.Stremio,
                    serverName: 'Stremio',
                    serverUrl: DEFAULT_STREMIO_URL,
                    current: true
                }],
                [Servers.TorrServer]: torrServerServers.length > 0 ? torrServerServers : [{
                    serverId: `torrserver-default`,
                    serverType: Servers.TorrServer,
                    serverName: 'TorrServer',
                    serverUrl: DEFAULT_TORRSERVER_URL,
                    current: true
                }]
            });

            // Set initial server type and selected server
            // First check if we have a current server in either type
            const stremioCurrentServer = stremioServers.find(server => server.current);
            const torrServerCurrentServer = torrServerServers.find(server => server.current);

            if (stremioCurrentServer) {
                setServerType(Servers.Stremio);
                setSelectedServerId(stremioCurrentServer.serverId);
            } else if (torrServerCurrentServer) {
                setServerType(Servers.TorrServer);
                setSelectedServerId(torrServerCurrentServer.serverId);
            } else if (stremioServers.length > 0) {
                setServerType(Servers.Stremio);
                setSelectedServerId(stremioServers[0].serverId);
            } else if (torrServerServers.length > 0) {
                setServerType(Servers.TorrServer);
                setSelectedServerId(torrServerServers[0].serverId);
            } else {
                // Fallback to Stremio default
                setServerType(Servers.Stremio);
                setSelectedServerId(`stremio-default`);
            }

        } catch (error) {
            console.error('Error loading server configurations:', error);
            showAlert('Error', 'Failed to load server configurations');

            // Set defaults in case of error
            const defaultStremio: ServerConfig = {
                serverId: `stremio-default`,
                serverType: Servers.Stremio,
                serverName: 'Stremio',
                serverUrl: DEFAULT_STREMIO_URL,
                current: true
            };

            setServersMap({
                [Servers.Stremio]: [defaultStremio],
                [Servers.TorrServer]: [{
                    serverId: `torrserver-default`,
                    serverType: Servers.TorrServer,
                    serverName: 'TorrServer',
                    serverUrl: DEFAULT_TORRSERVER_URL,
                    current: true
                }]
            });

            setServerType(Servers.Stremio);
            setSelectedServerId(defaultStremio.serverId);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            await fetchServerConfigs();
            await fetchContentData();
        };

        loadInitialData();
    }, [fetchServerConfigs, fetchContentData]);

    // Update selected server when server type changes
    useEffect(() => {
        if (serversMap[serverType] && serversMap[serverType].length > 0) {
            const currentServer = serversMap[serverType].find(server => server.current);
            setSelectedServerId(currentServer ? currentServer.serverId : serversMap[serverType][0].serverId);
        }
    }, [serverType, serversMap]);

    const getPlatformSpecificPlayers = () => {
        if (getOriginalPlatform() === 'android') {
            return [
                // { name: Players.Default, scheme: 'STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/default.png') },
                { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/chrome.png') },
                { name: Players.VLC, scheme: 'vlc://STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/vlc.png') },
                { name: Players.MXPlayer, scheme: 'intent:STREAMURL?sign=Yva5dQp8cFQpVAMUh1QxNWbZAZ2h05lYQ4qAxqf717w=:0#Intent;package=com.mxtech.videoplayer.ad;S.title=STREAMTITLE;end', encodeUrl: false, icon: require('@/assets/images/players/mxplayer.png') },
                { name: Players.MXPlayerPro, scheme: 'intent:STREAMURL?sign=Yva5dQp8cFQpVAMUh1QxNWbZAZ2h05lYQ4qAxqf717w=:0#Intent;package=com.mxtech.videoplayer.pro;S.title=STREAMTITLE;end', encodeUrl: false, icon: require('@/assets/images/players/mxplayer.png') },
                { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=STREAMURL', encodeUrl: true, icon: require('@/assets/images/players/vidhub.png') },
            ];
        } else if (getOriginalPlatform() === 'ios') {
            return [
                // { name: Players.Default, scheme: 'STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/default.png') },
                { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/chrome.png') },
                { name: Players.VLC, scheme: 'vlc://STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/vlc.png') },
                { name: Players.Infuse, scheme: 'infuse://x-callback-url/play?url=STREAMURL', encodeUrl: true, icon: require('@/assets/images/players/infuse.png') },
                { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=STREAMURL', encodeUrl: true, icon: require('@/assets/images/players/vidhub.png') },
                { name: Players.OutPlayer, scheme: 'outplayer://STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/outplayer.png') },
            ];
        } else if (getOriginalPlatform() === 'web') {
            return [
                // { name: Players.Default, scheme: 'STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/default.png') },
                { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/chrome.png') }
            ];
        } else if (getOriginalPlatform() === 'windows') {
            return [
                // { name: Players.Default, scheme: 'STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/default.png') },
                { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/chrome.png') },
            ];
        } else if (getOriginalPlatform() === 'macos') {
            return [
                // { name: Players.Default, scheme: 'STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/default.png') },
                { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/chrome.png') },
                { name: Players.VLC, scheme: 'vlc://STREAMURL', encodeUrl: false, icon: require('@/assets/images/players/vlc.png') },
                { name: Players.Infuse, scheme: 'infuse://x-callback-url/play?url=STREAMURL', encodeUrl: true, icon: require('@/assets/images/players/infuse.png') },
                { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=STREAMURL', encodeUrl: true, icon: require('@/assets/images/players/vidhub.png') },
            ];
        }
        return [];
    };

    const generatePlayerUrlWithInfoHash = async (infoHash: string, serverType: string, serverUrl: string) => {
        try {
            setStatusText('Torrent details sent to the server. This may take a moment. Please wait...');
            if (serverType === Servers.Stremio) {
                return await generateStremioPlayerUrl(infoHash, serverUrl, type, season, episode);
            }
            if (serverType === Servers.TorrServer) {
                const videoUrl = await generateTorrServerPlayerUrl(infoHash, serverUrl, type, season, episode);
                return videoUrl;
            }
            return '';
        } catch (error) {
            console.error('Error generating player URL:', error);
            throw error;
        }
    };

    const [isPlaying, setIsPlaying] = useState(false);  // Track playback status

    const handleCancel = () => {
        setPlayBtnDisabled(false);
        setModalVisible(false);
        setStatusText('');
        setIsPlaying(false);  // Stop playback process when cancel is pressed
    };

    const handlePlay = async () => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
        if (isPlaying) {
            return;
        }

        setIsPlaying(true);
        setPlayBtnDisabled(true);
        setModalVisible(true);
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }

        // Only check for player and server selection, not URL
        if (!selectedPlayer || (!url && !selectedServerId)) {
            setStatusText('Error: Please select a media player and server.');
            showAlert('Error', 'Please select a media player and server.');
            setPlayBtnDisabled(false);
            setModalVisible(false);
            setIsPlaying(false);
            return;
        }

        // Find the selected server from the current server type
        const selectedServer = serversMap[serverType].find(s => s.serverId === selectedServerId);
        const player = players.find((p) => p.name === selectedPlayer);

        if (!player) {
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
                videoUrl = await generatePlayerUrlWithInfoHash(infoHash, selectedServer.serverType, selectedServer.serverUrl);
                setStatusText('URL Generated...');
            }

            if (!videoUrl) {
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
            console.log('Player URL', playerUrl);
            if (playerUrl) {
                if (selectedPlayer === Players.Default) {
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
                    console.log('PlayerUrl', playerUrl);
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

    if (loading) {
        return (
            <SafeAreaView style={styles.centeredContainer}>
                <Text style={styles.loadingText}>Loading configurations...</Text>
            </SafeAreaView>
        );
    }

    const handleServerToggle = async (type: string) => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
        setServerType(type);
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.contentContainer}>
                    <Text style={[styles.header, { marginVertical: 10 }]}>Stream Details</Text>
                    <DetailsRow label="Name" value={name} numOfLines={3} />
                    {title && <DetailsRow label="Title" value={title} />}
                    {description && <DetailsRow label="Description" value={description} multiline />}

                    {!url && infoHash ? (
                        <>
                            {/* Server Type Selection */}
                            <Text style={styles.header}>Server Type</Text>
                            <View style={styles.radioGroup}>
                                {Object.keys(serversMap).map((type) => (
                                    <Pressable
                                        key={type}
                                        style={styles.radioContainer}
                                        onPress={() => handleServerToggle(type)}
                                    >
                                        <View>
                                            <MaterialIcons
                                                name={serverType === type ? 'check-circle' : 'check-circle-outline'}
                                                size={26}
                                                color={'#ffffff'}
                                                style={styles.radioIcon}
                                            />
                                        </View>
                                        <View style={styles.radioRow}>
                                            <View style={styles.iconLabel}>
                                                <Text style={styles.radioLabel}>
                                                    {type === Servers.Stremio ? 'Stremio' : 'TorrServer'}
                                                </Text>
                                            </View>
                                            <Text style={styles.radioValue}>
                                                {serversMap[type].find(s => s.serverType === type)?.serverUrl}
                                            </Text>
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    ) : null}

                    <PlayerSelectionGroup
                        title="Media Players"
                        options={players}
                        selected={selectedPlayer}
                        onSelect={setSelectedPlayer}
                        isPlayer
                    />
                    <View style={styles.buttonContainer}>
                        <Pressable
                            style={[styles.button, (playBtnDisabled || !selectedPlayer || !selectedServerId) && styles.buttonDisabled]}
                            onPress={handlePlay}
                            disabled={playBtnDisabled || !selectedPlayer || !selectedServerId}>
                            <Text style={styles.buttonText}>Play</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

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
        </SafeAreaView >
    );
};

const DetailsRow = ({ label, value, multiline, numOfLines }: { label: string; value: string; multiline?: boolean, numOfLines?: number }) => {
    return (
        <View style={styles.detailsItem}>
            <Text style={styles.label}>{label}:</Text>
            <Text numberOfLines={numOfLines ?? 8} style={[
                styles.value,
                multiline && { flexWrap: 'wrap' }
            ]}>{value}</Text>
        </View>
    );
};

const PlayerSelectionGroup = ({
    title,
    options,
    selected,
    onSelect,
    isPlayer = false,
}: {
    title: string;
    options: { name: string; url?: string; icon?: any }[];
    selected: string | null;
    onSelect: (name: string) => void;
    isPlayer?: boolean;
}) => {
    const handleSelectPlayer = async (name: string) => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
        onSelect(name);
    };

    return (
        <View>
            <Text style={styles.header}>{title}</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.playerList}>
                {options.map((option) => (
                    <View key={option.name}>
                        <Pressable
                            style={styles.playerContainer}
                            onPress={() => handleSelectPlayer(option.name)}
                        >
                            {isPlayer && option.icon && (
                                <Image resizeMode='cover' source={option.icon} style={styles.playerIcon} />
                            )}
                        </Pressable>
                        <View style={styles.inlineContainer}>
                            {
                                selected === option.name ? (
                                    <View>
                                        <MaterialIcons
                                            name="verified"
                                            size={20}
                                            color={'#ffffff'}
                                            style={styles.checkIcon}
                                        />
                                    </View>
                                ) : null
                            }
                            <Text style={styles.playerName}>{option.name}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 30,
        width: '100%',
        margin: 'auto',
        maxWidth: 780
    },
    contentContainer: {
        marginHorizontal: 20,
        marginVertical: 20
    },
    mediaItem: {
        marginBottom: 20,
        padding: 15,
        borderRadius: 10,
    },
    detailsItem: {
        marginBottom: 20,
        marginHorizontal: 5
    },
    label: {
        fontSize: 15,
        fontWeight: 'bold',
        paddingHorizontal: 2,
        marginBottom: 5
    },
    value: {
        fontSize: 14,
        paddingHorizontal: 2
    },
    radioGroup: {
        marginVertical: 5
    },
    radioRow: {
        justifyContent: 'space-between',
    },
    iconLabel: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    playerList: {
        marginVertical: 10,
        paddingHorizontal: 5
    },
    playerContainer: {
        marginHorizontal: 12,
        padding: 5,
        borderRadius: 10,
    },
    playerSelected: {
        backgroundColor: '#ffffff',
    },
    playerIcon: {
        width: 50,
        height: 50,
        borderRadius: 5
    },
    playerName: {
        fontSize: 14,
        textAlign: 'center',
        marginVertical: 10,
        paddingHorizontal: 7
    },
    header: {
        fontSize: 16,
        marginVertical: 15,
        fontWeight: 'bold'
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10
    },
    radioLabel: {
        fontSize: 15,
        marginRight: 10,
    },
    radioValue: {
        fontSize: 13,
        paddingTop: 5
    },
    radioIcon: {
        marginRight: 20,
    },
    checkIcon: {
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        marginTop: 20,
        paddingVertical: 15,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderRadius: 30,
        minWidth: 150,
        backgroundColor: '#535aff'
    },
    buttonText: {
        fontSize: 16,
        color: '#ffffff',
        paddingHorizontal: 10
    },
    buttonDisabled: {
        backgroundColor: '#3b3b3b',
        opacity: 0.7,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    statusText: {
        marginTop: 20,
        fontSize: 14,
        paddingBottom: 30,
    },
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
        marginVertical: 20
    },
    activityIndicator: {
        marginVertical: 10,
        color: '#ffffff',
    },
    closeIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
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
        color: '#ffffff'
    },
    inlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    badge: {
        position: 'absolute',
        right: 0
    }
});

export default StreamDetailsScreen;