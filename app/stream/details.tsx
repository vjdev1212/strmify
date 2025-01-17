import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, ScrollView, Pressable, Linking, Image, Platform, useColorScheme, Modal, TouchableWithoutFeedback, SafeAreaView } from 'react-native';
import { ActivityIndicator, StatusBar, Text, View } from '@/components/Themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { generateStremioPlayerUrl } from '@/clients/stremio';
import { generateTorrServerPlayerUrl } from '@/clients/torrserver';
import { ServerConfig } from '@/components/ServerConfig';
import { isHapticsSupported, showAlert } from '@/utils/platform';

enum Servers {
    Stremio = 'Stremio',
    TorrServer = 'TorrServer',
}

enum Players {
    Default = 'Default',
    Browser = 'Browser',
    VLC = 'VLC',
    Infuse = 'Infuse',
    VidHub = 'VidHub',
    OutPlayer = 'OutPlayer'
}

const StreamDetailsScreen = () => {
    const [servers, setServers] = useState<ServerConfig[]>([]);
    const [players, setPlayers] = useState<{ name: string; scheme: string; encodeUrl: boolean; icon: any }[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [statusText, setStatusText] = useState('');
    const [metaData, setMetaData] = useState<any>(null);
    const [playBtnDisabled, setPlayBtnDisabled] = useState<boolean>(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const isWeb = Platform.OS === 'web';
    const colorScheme = isWeb ? 'dark' : useColorScheme();

    useEffect(() => {
        const loadPlayers = async () => {
            const platformPlayers = getPlatformSpecificPlayers();
            setPlayers(platformPlayers);
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
                console.error('No server configuration found in AsyncStorage');
                return;
            }
            const servers: ServerConfig[] = JSON.parse(storedServers);
            const enabledServers = servers.filter((server) => server.enabled);
            const defaultServer = enabledServers.find((server) => server.isDefault);
            if (defaultServer) {
                setSelectedServer(defaultServer.serverId);
            } else if (enabledServers.length > 0) {
                setSelectedServer(enabledServers[0].serverId);
            }
            setServers(enabledServers);
        } catch (error) {
            console.error('Error loading server configurations:', error);
            showAlert('Error', 'Failed to load server configurations');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            await fetchServerConfigs();
            await fetchContentData();
            const platformPlayers = getPlatformSpecificPlayers();
            setPlayers(platformPlayers);
            if (platformPlayers.length > 0) setSelectedPlayer(platformPlayers[0].name);
        };

        loadInitialData();
    }, [fetchServerConfigs, fetchContentData]);

    const getPlatformSpecificPlayers = () => {
        if (getOriginalPlatform() === 'android') {
            return [
                { name: Players.Default, scheme: '', encodeUrl: false, icon: require('@/assets/images/players/default.png') },
                { name: Players.VLC, scheme: 'vlc://', encodeUrl: false, icon: require('@/assets/images/players/vlc.png') },
                { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=', encodeUrl: true, icon: require('@/assets/images/players/vidhub.png') },
            ];
        } else if (getOriginalPlatform() === 'ios') {
            return [
                { name: Players.Default, scheme: '', encodeUrl: false, icon: require('@/assets/images/players/default.png') },
                { name: Players.VLC, scheme: 'vlc://', encodeUrl: false, icon: require('@/assets/images/players/vlc.png') },
                { name: Players.Infuse, scheme: 'infuse://x-callback-url/play?url=', encodeUrl: true, icon: require('@/assets/images/players/infuse.png') },
                { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=', encodeUrl: true, icon: require('@/assets/images/players/vidhub.png') },
                { name: Players.OutPlayer, scheme: 'outplayer://', encodeUrl: false, icon: require('@/assets/images/players/outplayer.png') },
            ];
        } else if (getOriginalPlatform() === 'web') {
            return [
                { name: Players.Default, scheme: '', encodeUrl: false, icon: require('@/assets/images/players/default.png') },
                { name: Players.Browser, scheme: '', encodeUrl: false, icon: require('@/assets/images/players/chrome.png') }
            ];
        }
        return [];
    };

    const getOriginalPlatform = () => {
        if (Platform.OS !== 'web') {
            return Platform.OS;
        }

        const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';

        if (/iPad|iPhone|iPod/.test(userAgent)) {
            return 'ios';
        }

        if (/android/i.test(userAgent)) {
            return 'android';
        }

        return 'web';
    };

    const generatePlayerUrlWithInfoHash = async (infoHash: string, serverType: string, serverUrl: string) => {
        try {
            setStatusText('Torrent details sent to the server. Please wait while the server generates the link...');
            if (serverType === Servers.Stremio.toLocaleLowerCase()) {
                return await generateStremioPlayerUrl(infoHash, serverUrl, type, season, episode);
            }
            if (serverType === Servers.TorrServer.toLocaleLowerCase()) {
                const videoUrl = await generateTorrServerPlayerUrl(infoHash, serverUrl, type, season, episode);
                return videoUrl;
            }
            return '';
        } catch (error) {
            console.error('Error generating player URL:', error);
            throw error;
        }
    };

    const [isPlaying, setIsPlaying] = useState(false);  // New state to track playback status

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

        if (!selectedPlayer || (!url && !selectedServer)) {
            setStatusText('Error: Please select a media player and server.');
            showAlert('Error', 'Please select a media player and server.');
            setPlayBtnDisabled(false);
            setModalVisible(false);
            setIsPlaying(false);  // Stop playback if error occurs
            return;
        }

        const server = servers.find((s) => s.serverId === selectedServer);
        const player = players.find((p) => p.name === selectedPlayer);

        if (!player) {
            setStatusText('Error: Invalid media player selection.');
            showAlert('Error', 'Invalid media player selection.');
            setPlayBtnDisabled(false);
            setModalVisible(false);
            setIsPlaying(false);  // Stop playback if error occurs
            return;
        }

        try {
            let videoUrl = url || '';
            if (!url && infoHash && server) {
                setStatusText('Processing the InfoHash...');
                videoUrl = await generatePlayerUrlWithInfoHash(infoHash, server.serverType, server.serverUrl);
                setStatusText('URL Generated...');
            }

            if (!videoUrl) {
                setStatusText('Error: Unable to generate a valid video URL.');
                showAlert('Error', 'Unable to generate a valid video URL.');
                setPlayBtnDisabled(false);
                setModalVisible(false);
                setIsPlaying(false);  // Stop playback if error occurs
                return;
            }

            const streamUrl = player.encodeUrl ? encodeURIComponent(videoUrl) : videoUrl;
            const playerUrl = `${player.scheme}${streamUrl}`;
            if (playerUrl) {
                if (selectedPlayer === Players.Default) {
                    router.push({
                        pathname: '/stream/player',
                        params: {
                            videoUrl: playerUrl,
                            title: contentTitle,
                            artwork: `https://images.metahub.space/background/medium/${imdbid}/img`
                        },
                    })
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
            setIsPlaying(false);  // Reset playback state
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centeredContainer}>
                <Text style={styles.loadingText}>Loading configurations...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 30 }]}>
                <Text style={[styles.header, { marginVertical: 10 }]}>Stream Details</Text>
                <DetailsRow label="Name" value={name} />
                {title && <DetailsRow label="Title" value={title} />}
                {description && <DetailsRow label="Description" value={description} multiline />}
                {!url && servers.length > 0 && (
                    <ServerSelectionGroup
                        title="Servers"
                        options={servers}
                        selected={selectedServer}
                        onSelect={setSelectedServer}
                    />
                )}
                <PlayerSelectionGroup
                    title="Media Players"
                    options={players}
                    selected={selectedPlayer}
                    onSelect={setSelectedPlayer}
                    isPlayer
                />
                <View style={styles.buttonContainer}>
                    <Pressable
                        style={[styles.button, (playBtnDisabled || !selectedPlayer || (infoHash && !selectedServer)) && styles.buttonDisabled]}
                        onPress={handlePlay}
                        disabled={playBtnDisabled || !selectedPlayer || (infoHash && !selectedServer) || false}
                    >
                        <Text style={styles.buttonText}>Play</Text>
                    </Pressable>
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
                        <View
                            style={[styles.modalContainer, { backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#f0f0f0' }]}>
                            <ActivityIndicator size="large" color="#535aff" style={styles.activityIndicator} />
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

const DetailsRow = ({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) => (
    <View style={styles.row}>
        <Text style={styles.label}>{label}:</Text>
        <Text style={[styles.value, multiline && { flexWrap: 'wrap' }]}>{value}</Text>
    </View>
);

const ServerSelectionGroup = ({
    title,
    options,
    selected,
    onSelect
}: {
    title: string;
    options: any[];
    selected: string | null;
    onSelect: (name: string) => void;
    isPlayer?: boolean;
}) => (
    <>
        <Text style={styles.header}>{title}</Text>
        <View style={styles.radioGroup}>
            {options.map((option) => (
                <Pressable
                    key={option.serverId}
                    style={styles.radioContainer}
                    onPress={() => onSelect(option.serverId)}
                >
                    <View style={styles.radioRow}>
                        <View style={styles.iconLabel}>
                            <Text style={styles.radioLabel}>{option.serverName}</Text>
                        </View>
                        {option.serverUrl && <Text style={styles.radioValue}>{option.serverUrl}</Text>}
                    </View>
                    <View>
                        {selected === option.serverId && (
                            <MaterialIcons
                                name="check-circle"
                                size={26}
                                color="#535aff"
                                style={styles.radioIcon}
                            />
                        )}
                    </View>
                </Pressable>
            ))}
        </View>
    </>
);

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
    const isWeb = Platform.OS === 'web';
    const colorScheme = isWeb ? 'dark' : useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const handleSelectPlayer = async (name: string) => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        } onSelect(name);
    };

    return (
        <View>
            <Text style={styles.header}>{title}</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.playerList]}>
                {options.map((option) => (
                    <View key={option.name}>
                        <Pressable
                            style={[
                                styles.playerContainer,
                                selected === option.name && {
                                    backgroundColor: isDarkMode ? '#2f2f2f' : '#eaeaea',
                                },
                            ]}
                            onPress={() => handleSelectPlayer(option.name)}
                        >
                            {isPlayer && option.icon && (
                                <Image resizeMode='cover' source={option.icon} style={styles.playerIcon} />
                            )}
                        </Pressable>
                        <Text style={styles.playerName}>{option.name}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        marginTop: 20,
        marginHorizontal: 10
    },
    mediaItem: {
        marginBottom: 20,
        padding: 15,
        borderRadius: 10,
    },
    row: {
        flexDirection: 'row',
        marginVertical: 10,
    },
    label: {
        fontSize: 14,
        flex: 1,
    },
    value: {
        fontSize: 14,
        flex: 4
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
    },
    playerContainer: {
        margin: 5,
        padding: 8,
        borderRadius: 10,
    },
    playerSelected: {
        backgroundColor: '#ffffff',
    },
    playerIcon: {
        width: 50,
        height: 50,
        padding: 5,
        borderRadius: 10
    },
    playerName: {
        fontSize: 14,
        textAlign: 'center',
        marginVertical: 5
    },
    header: {
        fontSize: 16,
        marginVertical: 10,
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
        marginHorizontal: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10
    },
    button: {
        marginTop: 20,
        paddingVertical: 15,
        paddingHorizontal: 20,
        alignItems: 'center',
        backgroundColor: '#535aff',
        borderRadius: 30,
        minWidth: 150
    },
    buttonText: {
        fontSize: 16,
        color: '#ffffff',
        paddingHorizontal: 10
    },
    buttonDisabled: {
        backgroundColor: '#888888',
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        padding: 20,
        borderRadius: 10,
        minWidth: 250,
        maxWidth: 300,
        minHeight: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalText: {
        fontSize: 16,
        textAlign: 'center',
        marginVertical: 20
    },
    activityIndicator: {
        marginVertical: 10,
        color: '#535aff',
    },
    closeIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    cancelButton: {
        marginVertical: 20,
        paddingVertical: 12,
        backgroundColor: '#535aff',
        borderRadius: 30,
        alignItems: 'center',
        minWidth: 120,
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#fff',
    },
});

export default StreamDetailsScreen;
