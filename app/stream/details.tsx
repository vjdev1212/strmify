import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Alert, Pressable, Linking, Image, Platform } from 'react-native';
import { Text, View } from '@/components/Themed'; // Replace with your custom themed components
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ServerConfig from '@/components/ServerConfig';
import { generateStremioPlayerUrl } from '@/clients/stremio';
import { generateTorrServerPlayerUrl } from '@/clients/torrserver';
import BottomSpacing from '@/components/BottomSpacing';

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

    useEffect(() => {
        // Load servers and set platform-specific players
        const loadInitialData = async () => {
            await fetchServerConfigs();
            await fetchContentData();
            setPlayers(getPlatformSpecificPlayers());
        };

        loadInitialData();
    }, []);

    const fetchContentData = async () => {
        const stremioMetaDataUrl = `https://cinemeta-live.strem.io/meta/${type}/${imdbid}.json`
        const metaDataResponse = await fetch(stremioMetaDataUrl);
        if (metaDataResponse.ok) {
            const data = await metaDataResponse.json();
            const meta = data.meta;
            if (meta) {
                setMetaData(meta);
            } else {
                setMetaData(null);
            }
        }
    }

    const fetchServerConfigs = async () => {
        try {
            const storedServers = await AsyncStorage.getItem('servers');

            if (!storedServers) {
                console.error('No server configuration found in AsyncStorage');
                return;
            }

            const servers: any[] = JSON.parse(storedServers);

            // Filter out only the enabled servers
            const enabledServers = servers.filter((server) => server.enabled);

            // Set the servers state
            setServers(enabledServers);

            // Set the default selected server to the first enabled server if available
            if (enabledServers.length > 0) {
                setSelectedServer(enabledServers[0].serverId);
            }
        } catch (error) {
            console.error('Error loading server configurations:', error);
            Alert.alert('Error', 'Failed to load server configurations');
        } finally {
            setLoading(false);
        }
    };

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
            return [
                { name: Players.Browser, scheme: '', encodeUrl: false, icon: require('@/assets/images/players/chrome.png') },
            ];
        }

        return [];
    };

    const generatePlayerUrlWithInfoHash = async (infoHash: string, serverType: string, serverUrl: string) => {
        try {
            let videoUrl = '';

            if (serverType === Servers.Stremio.toLocaleLowerCase()) {
                videoUrl = await generateStremioPlayerUrl(infoHash, serverUrl);
                return videoUrl;
            }

            if (serverType === Servers.TorrServer.toLocaleLowerCase()) {
                videoUrl = await generateTorrServerPlayerUrl(infoHash, serverUrl, metaData, type);
                setStatusText('Stream sent to TorrServer. This may take some time. Please wait..');
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

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

        if (!selectedPlayer) {
            Alert.alert('Error', 'Please select a media player.');
            return;
        }


        if (!url && !selectedServer) {
            Alert.alert('Error', 'Please select a server or provide a valid URL.');
            return;
        }

        const server = servers.find((s) => s.serverId === selectedServer);
        const player = players.find((p) => p.name === selectedPlayer);

        if (!player) {
            Alert.alert('Error', 'Invalid media player selection.');
            return;
        }

        try {
            let videoUrl = url || '';
            if (!url && infoHash && server) {
                setStatusText('Generating Url...');
                videoUrl = await generatePlayerUrlWithInfoHash(infoHash, server.serverType, server.serverUrl);
                setTimeout(() => {
                    setStatusText('Url Generated...');
                }, 500);
            }

            if (!videoUrl) {
                console.log(videoUrl);
                Alert.alert('Error', 'Unable to generate a valid video URL.');
                return;
            }

            const streamUrl = player.encodeUrl ? encodeURIComponent(videoUrl) : videoUrl;
            const playerUrl = `${player.scheme}${streamUrl}`;

            console.log(playerUrl);
            if (playerUrl) {
                setTimeout(() => {
                    setStatusText('Opening Stream in Media Player...');
                    Linking.openURL(playerUrl).then(() => {
                        setStatusText('Stream Openend in Media Player...');
                        setTimeout(() => {
                            setStatusText('');
                        }, 5000);
                    });
                }, 500);
            }
        } catch (error) {
            console.error('Error during playback process:', error);
            Alert.alert('Error', 'An error occurred while trying to play the stream.');
        } finally {
            setStatusText('');
        }
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

                {
                    statusText !== null && statusText !== undefined && statusText !== '' ?
                        (<Text style={styles.statusText}>{statusText}</Text>) : null
                }

                <View style={styles.buttonContainer}>
                    <Pressable style={styles.button} onPress={handlePlay}>
                        <Text style={styles.buttonText}>Play</Text>
                    </Pressable>
                </View>
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
                                name="check"
                                size={24}
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
}) => (
    <>
        <Text style={styles.header}>{title}</Text>
        <View style={styles.radioGroup}>
            {options.map((option) => (
                <Pressable
                    key={option.name}
                    style={styles.radioContainer}
                    onPress={() => onSelect(option.name)}
                >
                    <View style={styles.radioRow}>
                        <View style={styles.iconLabel}>
                            {isPlayer && option.icon && <Image source={option.icon} style={styles.playerIcon} />}
                            <Text style={styles.radioLabel}>{option.name}</Text>
                        </View>
                        {option.url && <Text style={styles.radioValue}>{option.url}</Text>}
                    </View>
                    <View>
                        {selected === option.name && (
                            <MaterialIcons
                                name="check"
                                size={24}
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
        flex: 2,
        fontStyle: 'italic'
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
    playerIcon: {
        width: 32,
        height: 32,
        marginRight: 10,
        borderRadius: 8
    },
    header: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
        marginTop: 15,
        textDecorationLine: 'underline',
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
        textAlign: 'center'
    },
});

export default StreamDetailsScreen;
