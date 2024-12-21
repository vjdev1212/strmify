import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View as RNView, Alert, Linking } from 'react-native';
import { Text } from '@/components/Themed';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const StreamScreen = () => {
    const { imdbid, type, season, episode } = useLocalSearchParams();
    const [addons, setAddons] = useState<any[]>([]);
    const [selectedAddon, setSelectedAddon] = useState<any>(null); // Track selected addon
    const [streams, setStreams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAddons = async () => {
            try {
                // Get the stored addons from AsyncStorage
                const storedAddons = await AsyncStorage.getItem('addons');
                const addonsData = storedAddons ? JSON.parse(storedAddons) : {};
                console.log(addonsData);
                setAddons(Object.values(addonsData)); // Set the addon list
            } catch (error) {
                console.error('Error fetching addons:', error);
                Alert.alert('Error', 'Failed to load addons');
            }
        };

        fetchAddons();
    }, []);

    useEffect(() => {
        if (selectedAddon) {
            // Fetch streams when an addon is selected
            const fetchStreams = async () => {
                try {
                    const addonUrl = selectedAddon?.url || '';
                    const streamBaseUrl = selectedAddon?.streamBaseUrl || addonUrl;

                    let streamUrl = '';
                    if (type === 'series') {
                        // For TV series, include season and episode info
                        streamUrl = `${streamBaseUrl}/stream/series/${imdbid}${season && episode ? `:${season}:${episode}` : ''}.json`;
                    } else {
                        // For movies, use only the imdbid
                        streamUrl = `${streamBaseUrl}/stream/${type}/${imdbid}.json`;
                    }

                    try {
                        console.log(`Fetching from: ${streamUrl}`);
                        const response = await fetch(streamUrl);
                        const data = await response.json();
                        if (data.streams) {
                            setStreams(data.streams);
                        }
                    } catch (error) {
                        console.error(`Error fetching from ${streamUrl}: `, error);
                    }
                } catch (error) {
                    console.error('Error fetching streams:', error);
                    Alert.alert('Error', 'Failed to load streams');
                } finally {
                    setLoading(false);
                }
            };

            fetchStreams();
        }
    }, [selectedAddon, imdbid, season, episode, type]);

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const renderAddonItem = ({ item }: any) => {
        const { name, logo } = item;
        const addonLogo = logo || '';
        return (
            <TouchableOpacity
                style={styles.addonItem}
                onPress={() => setSelectedAddon(item)} // Set selected addon
            >
                <Image source={{ uri: addonLogo }} style={styles.addonIcon} />
                <Text style={styles.addonName}>{name}</Text>
            </TouchableOpacity>
        );
    };

    const renderStreamItem = ({ item }: any) => {
        const { name, title, url, description, infoHash } = item;
        const streamType = url ? 'url' : 'magnet';

        const handleOpenLink = (streamUrl: string) => {
            if (streamType === 'url') {
                const appUrls = [
                    `vlc://${streamUrl}`,
                    `vidhub://open?url=${encodeURIComponent(streamUrl)}`,
                    `outplayer://open?url=${encodeURIComponent(streamUrl)}`,
                    `infuse://open?url=${encodeURIComponent(streamUrl)}`
                ];

                appUrls.some((appUrl) => {
                    Linking.canOpenURL(appUrl).then((supported) => {
                        if (supported) {
                            Linking.openURL(appUrl);
                            return true;
                        }
                        return false;
                    });
                });
            } else {
                Linking.openURL(`magnet:?xt=urn:btih:${infoHash}`);
            }
        };

        return (
            <RNView style={styles.streamItemContainer}>
                <TouchableOpacity
                    style={styles.streamItem}
                    onPress={() => handlePress()}
                >
                    <Text style={styles.streamName} numberOfLines={2}>
                        {name}
                    </Text>
                    <Text style={styles.streamTitle} numberOfLines={2}>
                        {title || description}
                    </Text>
                </TouchableOpacity>
            </RNView>
        );
    };

    return (
        <RNView style={styles.container}>
            <FlatList
                data={addons}
                renderItem={renderAddonItem}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.addonList}
            />
            {loading ? (
                <Text>Loading...</Text>
            ) : (
                <FlatList
                    data={streams}
                    renderItem={renderStreamItem}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={(item, index) => index.toString()}
                />
            )}
        </RNView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    addonList: {
        margin: 20,
    },
    addonItem: {
        alignItems: 'center',
        marginRight: 20,
    },
    addonIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginBottom: 5,
    },
    addonName: {
        fontSize: 12,
    },
    streamItemContainer: {
        marginBottom: 15,
        alignItems: 'center',
        width: '100%',
    },
    streamItem: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderRadius: 8,
        width: '100%',
        borderColor: 'gray',
        borderWidth: 1
    },
    streamName: {
        fontSize: 14,
        flex: 1,
        fontWeight: 'bold',
        marginBottom: 10
    },
    streamTitle: {
        fontSize: 14,
        flex: 1,
    },
});

export default StreamScreen;
