import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Alert, Pressable, Linking, Image } from 'react-native';
import { Text, View } from '@/components/Themed'; // Replace with your custom themed components
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

enum Servers {
    Stremio = 'Stremio',
    TorrServer = 'TorrServer',
}

enum Players {
    VLC = 'VLC',
    Infuse = 'Infuse',
    VidHub = 'VidHub',
    OutPlayer = 'OutPlayer'
}

const StreamDetailsScreen = () => {
    const [servers, setServers] = useState<{ name: string; url: string }[]>([]);
    const [players] = useState([
        { name: Players.VLC, scheme: 'vlc://', encodeUrl: false, icon: require('@/assets/images/players/vlc.png') },
        { name: Players.Infuse, scheme: 'infuse://x-callback-url/play?url=', encodeUrl: true, icon: require('@/assets/images/players/infuse.png') },
        { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=', encodeUrl: true, icon: require('@/assets/images/players/vidhub.png') },
        { name: Players.OutPlayer, scheme: 'outplayer://', encodeUrl: false, icon: require('@/assets/images/players/outplayer.png') },
    ]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusText, setStatusText] = useState('');

    const { name, title, description, url, infoHash } = useLocalSearchParams<{
        name: string;
        title: string;
        description?: string;
        url?: string;
        infoHash?: string;
    }>();

    useEffect(() => {
        const fetchServerConfigs = async () => {
            try {
                const configs = await Promise.all([
                    AsyncStorage.getItem('stremioServerConfig'),
                    AsyncStorage.getItem('torrServerConfig'),
                ]);

                const loadedServers = [
                    configs[0] && { name: Servers.Stremio, url: JSON.parse(configs[0]).url },
                    configs[1] && { name: Servers.TorrServer, url: JSON.parse(configs[1]).url },
                ].filter(Boolean) as { name: string; url: string }[];

                setServers(loadedServers);
            } catch (error) {
                console.error('Error loading server configurations:', error);
                Alert.alert('Error', 'Failed to load server configurations');
            } finally {
                setLoading(false);
            }
        };

        fetchServerConfigs();
    }, []);

    const callStremioServer = async (infoHash: string, serverUrl: string) => {
        try {
            const response = await fetch(`${serverUrl}/${infoHash}/create`, {
                method: 'POST',
                body: JSON.stringify({ torrent: { infoHash }, guessFileIdx: {} }),
            });

            if (!response.ok) {
                throw new Error('Failed to call the server endpoint.');
            }

            return response.json();
        } catch (error) {
            console.error('Error calling Stremio server:', error);
            Alert.alert('Error', 'Failed to contact the Stremio server. Please check your connection and try again.');
            throw error;
        }
    };

    const generatePlayerUrlWithInfoHash = async (infoHash: string, server: { name: string; url: string }) => {
        try {
            if (server.name === Servers.Stremio) {
                const data = await callStremioServer(infoHash, server.url);
                const videoUrl = `${server.url}/${infoHash}/${data.guessedFileIdx || 0}`;
                return videoUrl;
            }

            if (server.name === Servers.TorrServer) {
                // Add TorrServer logic here when applicable.
                return '';
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

        const server = servers.find((s) => s.name === selectedServer);
        const player = players.find((p) => p.name === selectedPlayer);

        if (!player) {
            Alert.alert('Error', 'Invalid media player selection.');
            return;
        }

        try {
            let videoUrl = url || '';
            if (!url && infoHash && server) {
                setStatusText('Generating Url..');
                videoUrl = await generatePlayerUrlWithInfoHash(infoHash, server);
                setTimeout(() => {
                    setStatusText('Url Generated..');
                }, 500);
            }

            if (!videoUrl) {
                Alert.alert('Error', 'Unable to generate a valid video URL.');
                return;
            }

            const streamUrl = player.encodeUrl ? encodeURIComponent(videoUrl) : videoUrl;
            const playerUrl = `${player.scheme}${streamUrl}`;

            console.log(playerUrl);
            if (playerUrl) {
                setStatusText('Opening Stream..');
                setTimeout(() => {
                    Linking.openURL(playerUrl);
                    setStatusText('Stream Opened in Media Player..');
                    setStatusText('');
                }, 500);
            }
        } catch (error) {
            console.error('Error during playback process:', error);
            Alert.alert('Error', 'An error occurred while trying to play the stream.');
        } finally {
            setStatusText('')
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
                    <SelectionGroup
                        title="Server"
                        options={servers}
                        selected={selectedServer}
                        onSelect={setSelectedServer}
                    />
                )}

                <SelectionGroup
                    title="Media Player"
                    options={players}
                    selected={selectedPlayer}
                    onSelect={setSelectedPlayer}
                    isPlayer
                />

                <View style={styles.buttonContainer}>
                    <Pressable style={styles.button} onPress={handlePlay}>
                        <Text style={styles.buttonText}>Play</Text>
                    </Pressable>
                </View>
                <Text style={styles.statusText}>{statusText}</Text>
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

const SelectionGroup = ({
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
        alignItems: 'center'
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
    }
});

export default StreamDetailsScreen;
