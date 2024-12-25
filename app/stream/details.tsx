import React, { useEffect, useState } from 'react';
import { StyleSheet, Pressable, ScrollView, Alert, Linking } from 'react-native';
import { Card, Text, View } from '@/components/Themed'; // Replace with your custom themed components
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import Checkbox from 'expo-checkbox';

const StreamDetailsScreen = () => {
    const [servers, setServers] = useState<{ name: string; url: string }[]>([]);
    const [players] = useState([
        { name: 'VLC', scheme: 'vlc-x-callback://x-callback-url/stream?url=' },
        { name: 'Infuse', scheme: 'infuse://x-callback-url/play?url=' },
        { name: 'VidHub', scheme: 'vidhub://play?url=' },
        { name: 'OutPlayer', scheme: 'outplayer://x-callback-url/stream?url=' },
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
                const stremioConfig = await AsyncStorage.getItem('stremioServerConfig');
                const torrServerConfig = await AsyncStorage.getItem('torrServerConfig');

                const loadedServers = [];
                if (stremioConfig) {
                    loadedServers.push({ name: 'Stremio Server', url: JSON.parse(stremioConfig).url });
                }
                if (torrServerConfig) {
                    loadedServers.push({ name: 'TorrServer', url: JSON.parse(torrServerConfig).url });
                }

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

    const handlePlay = () => {
        if (!selectedServer || !selectedPlayer) {
            Alert.alert('Error', 'Please select both a server and a media player.');
            return;
        }

        const serverUrl = servers.find((server) => server.name === selectedServer)?.url;
        const playerScheme = players.find((player) => player.name === selectedPlayer)?.scheme;

        if (!serverUrl || !playerScheme) {
            Alert.alert('Error', 'Invalid server or player selection.');
            return;
        }

        const streamUrl = url ? url : `${serverUrl}/stream/${infoHash}`;
        const playerUrl = `${playerScheme}${encodeURIComponent(streamUrl)}`;

        Linking.canOpenURL(playerUrl)
            .then((supported) => {
                if (supported) {
                    Linking.openURL(playerUrl);
                } else {
                    Alert.alert('Error', `${selectedPlayer} is not installed or does not support this URL scheme.`);
                }
            })
            .catch((error) => console.error('Error opening media player:', error));
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
                <View style={styles.row}>
                    <Text style={styles.label}>Name:</Text>
                    <Text style={styles.value}>{name}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Title:</Text>
                    <Text style={styles.value}>{title}</Text>
                </View>
                {description && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Description:</Text>
                        <Text style={styles.value}>{description}</Text>
                    </View>
                )}
                {infoHash && (
                    <View style={styles.row}>
                        <Text style={styles.label}>InfoHash:</Text>
                        <Text style={styles.value}>{infoHash}</Text>
                    </View>
                )}

                <Text style={styles.subtitle}>Select a server:</Text>
                {servers.map((server) => (
                    <View key={server.name} style={styles.checkboxContainer}>
                        <Checkbox
                            value={selectedServer === server.name}
                            onValueChange={() => setSelectedServer(server.name)}
                        />
                        <Text style={styles.checkboxLabel}>{server.name}</Text>
                    </View>
                ))}

                <Text style={styles.subtitle}>Select a media player:</Text>
                {players.map((player) => (
                    <View key={player.name} style={styles.checkboxContainer}>
                        <Checkbox
                            value={selectedPlayer === player.name}
                            onValueChange={() => setSelectedPlayer(player.name)}
                        />
                        <Text style={styles.checkboxLabel}>{player.name}</Text>
                    </View>
                ))}

                <Pressable style={styles.button} onPress={handlePlay}>
                    <Text style={styles.buttonText}>Play</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
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
        fontWeight: 'bold',
        flex: 1,
    },
    value: {
        fontSize: 14,
        flex: 3,
    },
    subtitle: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: 'bold',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    checkboxLabel: {
        marginLeft: 8,
        fontSize: 14,
    },
    button: {
        marginTop: 20,
        padding: 10,
        borderRadius: 5,
        borderWidth: 1,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
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
