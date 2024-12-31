import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, ScrollView, Alert, Pressable, Linking, Image, Platform, useColorScheme } from 'react-native';
import { StatusBar, Text, View } from '@/components/Themed'; // Replace with your custom themed components
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { generateStremioPlayerUrl } from '@/clients/stremio';
import { generateTorrServerPlayerUrl } from '@/clients/torrserver';
import { ServerConfig } from '@/components/ServerConfig';

enum Servers {
    Stremio = 'Stremio',
    TorrServer = 'TorrServer',
}

enum Players {
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
    const [loading, setLoading] = useState(true);
    const [statusText, setStatusText] = useState('');
    const [metaData, setMetaData] = useState<any>(null);
    const [playBtnDisabled, setPlayBtnDisabled] = useState<boolean>(false);

    const { imdbid, type, season, episode, name, title, description, url, infoHash } = useLocalSearchParams<{
        imdbid: string;
        type: string;
        season: string;
        episode: string;
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
            setServers(enabledServers);
            if (enabledServers.length > 0) setSelectedServer(enabledServers[0].serverId);
        } catch (error) {
            console.error('Error loading server configurations:', error);
            Alert.alert('Error', 'Failed to load server configurations');
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
        if (Platform.OS === 'android') {
            return [
                { name: Players.Browser, scheme: '', encodeUrl: false, icon: require('@/assets/images/players/chrome.png') },
                { name: Players.VLC, scheme: 'vlc://', encodeUrl: false, icon: require('@/assets/images/players/vlc.png') },
                { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=', encodeUrl: true, icon: require('@/assets/images/players/vidhub.png') },
            ];
        } else if (Platform.OS === 'ios') {
            return [
                { name: Players.Browser, scheme: '', encodeUrl: false, icon: require('@/assets/images/players/safari.png') },
                { name: Players.VLC, scheme: 'vlc://', encodeUrl: false, icon: require('@/assets/images/players/vlc.png') },
                { name: Players.Infuse, scheme: 'infuse://x-callback-url/play?url=', encodeUrl: true, icon: require('@/assets/images/players/infuse.png') },
                { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=', encodeUrl: true, icon: require('@/assets/images/players/vidhub.png') },
                { name: Players.OutPlayer, scheme: 'outplayer://', encodeUrl: false, icon: require('@/assets/images/players/outplayer.png') },
            ];
        } else if (Platform.OS === 'web') {
            return [{ name: Players.Browser, scheme: '', encodeUrl: false, icon: require('@/assets/images/players/chrome.png') }];
        }
        return [];
    };

    const generatePlayerUrlWithInfoHash = async (infoHash: string, serverType: string, serverUrl: string) => {
        try {
            if (serverType === Servers.Stremio.toLocaleLowerCase()) {
                return await generateStremioPlayerUrl(infoHash, serverUrl, type, season, episode);
            }
            if (serverType === Servers.TorrServer.toLocaleLowerCase()) {
                const videoUrl = await generateTorrServerPlayerUrl(infoHash, serverUrl, metaData, type);
                appendStatusText('Stream sent to TorrServer. This may take some time. Please wait..');
                await fetch(videoUrl, { method: 'HEAD' });
                return videoUrl;
            }
            return '';
        } catch (error) {
            console.error('Error generating player URL:', error);
            throw error;
        }
    };

    const handlePlay = async () => {
        setPlayBtnDisabled(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

        if (!selectedPlayer || (!url && !selectedServer)) {
            appendStatusText('Error: Please select a media player and server.');
            Alert.alert('Error', 'Please select a media player and server.');
            setPlayBtnDisabled(false);
            return;
        }

        const server = servers.find((s) => s.serverId === selectedServer);
        const player = players.find((p) => p.name === selectedPlayer);

        if (!player) {
            appendStatusText('Error: Invalid media player selection.');
            Alert.alert('Error', 'Invalid media player selection.');
            setPlayBtnDisabled(false);
            return;
        }

        try {
            let videoUrl = url || '';
            if (!url && infoHash && server) {
                appendStatusText('Generating URL...');
                videoUrl = await generatePlayerUrlWithInfoHash(infoHash, server.serverType, server.serverUrl);
                appendStatusText('URL Generated...');
            }

            if (!videoUrl) {
                appendStatusText('Error: Unable to generate a valid video URL.');
                Alert.alert('Error', 'Unable to generate a valid video URL.');
                setPlayBtnDisabled(false);
                return;
            }

            const streamUrl = player.encodeUrl ? encodeURIComponent(videoUrl) : videoUrl;
            const playerUrl = `${player.scheme}${streamUrl}`;
            if (playerUrl) {
                appendStatusText('Opening Stream in Media Player...');
                await Linking.openURL(playerUrl);
                appendStatusText('Stream Opened in Media Player...');
            }
        } catch (error) {
            console.error('Error during playback process:', error);
            appendStatusText('Error: An error occurred while trying to play the stream.');
            Alert.alert('Error', 'An error occurred while trying to play the stream.');
        } finally {
            setPlayBtnDisabled(false);
            setStatusText('');
        }
    };

    const appendStatusText = (newText: string) => {
        setStatusText((prev) => (prev ? `${prev}\n${newText}` : newText));
    };

    if (loading) {
        return (
            <View style={styles.centeredContainer}>
                <Text style={styles.loadingText}>Loading configurations...</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <StatusBar />
            <View style={styles.mediaItem}>
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
                {statusText && <Text style={styles.statusText}>{statusText}</Text>}
            </View>
        </ScrollView>
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
    const colorScheme = useColorScheme(); // Determine light or dark mode
    const isDarkMode = colorScheme === 'dark';

    return (
        <>
            <Text style={styles.header}>{title}</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.playerList}>
                {options.map((option) => (
                    <View key={option.name}>
                        <Pressable
                            style={[
                                styles.playerContainer,
                                selected === option.name && {
                                    backgroundColor: isDarkMode ? '#2e2e34' : '#eaeaea',
                                },
                            ]}
                            onPress={() => onSelect(option.name)}
                        >
                            {isPlayer && option.icon && (
                                <Image source={option.icon} style={styles.playerIcon} />
                            )}
                        </Pressable>
                        <Text style={styles.playerName}>{option.name}</Text>
                    </View>
                ))}
            </ScrollView>
        </>
    )
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    mediaItem: {
        marginBottom: 20,
        padding: 15,
        borderRadius: 10,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 20,
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
        marginVertical: 10
    },
    radioRow: {
        justifyContent: 'space-between',
        paddingVertical: 5
    },
    iconLabel: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    playerList: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingVertical: 10,
        marginVertical: 10
    },
    playerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 10,
        marginVertical: 10,
        padding: 5,
        borderRadius: 10,
    },
    playerSelected: {
        backgroundColor: '#ffffff',
    },
    playerIcon: {
        width: 50,
        height: 50,
        padding: 5,
        borderRadius: 10,
    },
    playerName: {
        fontSize: 14,
        color: '#000',
        textAlign: 'center',
    },
    header: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
        marginTop: 15,
        fontWeight: 'bold'
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10
    },
    radioLabel: {
        fontSize: 14,
        marginRight: 10,
    },
    radioValue: {
        fontSize: 13,
        paddingTop: 5,
        color: '#888888'
    },
    radioIcon: {
        marginHorizontal: 20,
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
        fontSize: 14
    },
});

export default StreamDetailsScreen;
