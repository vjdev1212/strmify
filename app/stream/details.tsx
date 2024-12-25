import React, { useEffect, useState } from 'react';
import { StyleSheet, Pressable, ScrollView, Alert, Linking } from 'react-native';
import { Card, Text, View } from '@/components/Themed'; // Replace with your custom themed components
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

const StreamDetailsScreen = () => {
    const [servers, setServers] = useState<{ name: string; url: string }[]>([]);
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

    const handlePlay = (streamUrl: string) => {
        const vlcUrl = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(streamUrl)}`;
        Linking.canOpenURL(vlcUrl)
            .then((supported) => {
                if (supported) {
                    Linking.openURL(vlcUrl);
                } else {
                    Alert.alert('Error', 'VLC player is not installed or does not support this URL scheme.');
                }
            })
            .catch((error) => console.error('Error opening VLC:', error));
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
                {url ? (
                    <Pressable
                        style={styles.button}
                        onPress={() => handlePlay(url)}
                    >
                        <Text style={styles.buttonText}>Play with VLC</Text>
                    </Pressable>
                ) : infoHash ? (
                    <View>
                        <Text style={styles.subtitle}>Choose a server to stream:</Text>
                        {servers.map((server) => (
                            <Pressable
                                key={server.name}
                                style={styles.button}
                                onPress={() => handlePlay(`${server.url}/stream/${infoHash}`)}
                            >
                                <Text style={styles.buttonText}>{server.name}</Text>
                            </Pressable>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.errorText}>Invalid media item: No URL or infoHash provided.</Text>
                )}
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
        marginBottom: 20
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
    button: {
        marginTop: 10,
        padding: 10,
        borderRadius: 5,
        borderWidth: 1,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    subtitle: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: 'bold',
    },
    errorText: {
        marginTop: 10,
        fontSize: 12,
        color: '#ff4d4d',
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
