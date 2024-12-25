import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Alert, Pressable, Linking } from 'react-native';
import { Text, View } from '@/components/Themed'; // Replace with your custom themed components
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

enum Servers {
    Stremio = 'Stremio',
    TorrServer = 'TorrServer',
}

const StreamDetailsScreen = () => {
    const [servers, setServers] = useState<{ name: string; url: string }[]>([]);
    const [players] = useState([
        { name: 'VLC', scheme: 'vlc://', encodeUrl: false },
        { name: 'Infuse', scheme: 'infuse://x-callback-url/play?url=', encodeUrl: true },
        { name: 'VidHub', scheme: 'open-vidhub://x-callback-url/open?url=', encodeUrl: true },
        { name: 'OutPlayer', scheme: 'outplayer://', encodeUrl: false },
    ]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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

    const generatePlayerUrl = async (infoHash: string, server: { name: string; url: string }, player: { scheme: string; encodeUrl: boolean }) => {
        try {
            if (server.name === Servers.Stremio) {
                const data = await callStremioServer(infoHash, server.url);
                const videoUrl = `${server.url}/${infoHash}/${data.guessedFileIdx || 0}`;
                const streamUrl = player.encodeUrl ? encodeURIComponent(url || videoUrl) : url || videoUrl;
                return `${player.scheme}${streamUrl}`;
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

        if (!selectedServer || !selectedPlayer) {
            Alert.alert('Error', 'Please select both a server and a media player.');
            return;
        }

        const server = servers.find((s) => s.name === selectedServer);
        const player = players.find((p) => p.name === selectedPlayer);

        if (!server || !player) {
            Alert.alert('Error', 'Invalid server or player selection.');
            return;
        }

        try {
            const playerUrl = infoHash ? await generatePlayerUrl(infoHash, server, player) : '';
            console.log(playerUrl);
            if (playerUrl) {
                Linking.openURL(playerUrl);
            }
        } catch (error) {
            console.error('Error during playback process:', error);
            Alert.alert('Error', 'An error occurred while trying to play the stream.');
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
                <SelectionGroup
                    title="Server"
                    options={servers}
                    selected={selectedServer}
                    onSelect={setSelectedServer}
                />
                <SelectionGroup
                    title="Media Player"
                    options={players}
                    selected={selectedPlayer}
                    onSelect={setSelectedPlayer}
                />
                <Pressable style={styles.button} onPress={handlePlay}>
                    <Text style={styles.buttonText}>Play</Text>
                </Pressable>
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
}: {
    title: string;
    options: { name: string; url?: string }[];
    selected: string | null;
    onSelect: (name: string) => void;
}) => (
    <>
        <Text style={styles.subtitle}>{title}:</Text>
        <View style={styles.radioGroup}>
            {options.map((option) => (
                <Pressable
                    key={option.name}
                    style={styles.radioContainer}
                    onPress={() => onSelect(option.name)}
                >
                    <View style={styles.radioRow}>
                        <Text style={styles.radioLabel}>{option.name}</Text>
                        {option.url && <Text style={styles.radioValue}>{option.url}</Text>}
                        {selected === option.name && (
                            <MaterialIcons
                                name="check-circle"
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
        fontWeight: 'bold',
        flex: 1,
    },
    value: {
        fontSize: 14,
        flex: 2,
    },
    radioGroup: {
        marginVertical: 10
    },
    radioRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5
    },
    subtitle: {
        fontSize: 14,
        fontWeight: 'bold',
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
        marginHorizontal: 20
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
        width: '50%'
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff'
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
});

export default StreamDetailsScreen;
