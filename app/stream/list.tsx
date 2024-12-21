import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View as RNView, Alert, Linking } from 'react-native';
import { Text } from '@/components/Themed';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const playerIcons: any = {
    vlc: require('../../assets/images/players/vlc.png'),
    vidhub: require('../../assets/images/players/vidhub.png'),
    outplayer: require('../../assets/images/players/outplayer.png'),
    infuse: require('../../assets/images/players/infuse.png'),
};

const StreamScreen = () => {
    const { imdbid, type, season, episode } = useLocalSearchParams();
    const [addons, setAddons] = useState<any[]>([]);
    const [selectedAddon, setSelectedAddon] = useState<any | null>(null); // Track selected addon
    const [streams, setStreams] = useState<any[]>([]); // Streams for selected addon
    const [expandedStream, setExpandedStream] = useState<any | null>(null); // Track expanded stream
    const [loading, setLoading] = useState(true);

    // Fetch all addons on mount
    useEffect(() => {
        const fetchAddons = async () => {
            try {
                const storedAddons = await AsyncStorage.getItem('addons');
                const addonsData = storedAddons ? JSON.parse(storedAddons) : {};
                const addonList = Object.values(addonsData); // Set the addon list

                setAddons(addonList); // Set all addons

                // Fetch streams for each addon
                fetchStreams(addonList);
                
                // Automatically select the first addon
                if (addonList.length > 0) {
                    setSelectedAddon(addonList[0]);
                }
            } catch (error) {
                console.error('Error fetching addons:', error);
                Alert.alert('Error', 'Failed to load addons');
            }
        };

        fetchAddons();
    }, []);

    // Fetch streams for all addons
    const fetchStreams = async (addonList: any[]) => {
        setLoading(true); // Start loading

        try {
            const allStreams: any[] = [];
            
            for (const addon of addonList) {
                const addonUrl = addon?.url || '';
                const streamBaseUrl = addon?.streamBaseUrl || addonUrl;
                let streamUrl = '';

                if (type === 'series') {
                    streamUrl = `${streamBaseUrl}/stream/series/${imdbid}${season && episode ? `:${season}:${episode}` : ''}.json`;
                } else {
                    streamUrl = `${streamBaseUrl}/stream/${type}/${imdbid}.json`;
                }

                const response = await fetch(streamUrl);
                const data = await response.json();

                if (data.streams) {
                    allStreams.push({ addon, streams: data.streams }); // Collect streams for each addon
                } else {
                    allStreams.push({ addon, streams: [] }); // No streams found for this addon
                }
            }

            // Set all streams for each addon
            setStreams(allStreams);
        } catch (error) {
            console.error('Error fetching streams:', error);
            Alert.alert('Error', 'Failed to load streams');
        } finally {
            setLoading(false); // End loading state
        }
    };

    // Handle stream selection (expand or collapse)
    const handleStreamExpand = (stream: any) => {
        setExpandedStream(expandedStream === stream ? null : stream); // Toggle expand on stream click
    };

    // Render each addon item
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

    // Handle opening the player with a selected stream
    const handleOpenPlayer = (player: string, streamUrl: string) => {
        // Mapping players to their respective callback URL schemes
        const playerUrls: { [key: string]: string } = {
            vlc: `vlc://${streamUrl}`, // VLC URL scheme
            vidhub: `open-vidhub://x-callback-url/open?url=${encodeURIComponent(streamUrl)}`, // VidHub URL scheme
            outplayer: `outplayer://${streamUrl}`, // OutPlayer URL scheme
            infuse: `infuse://x-callback-url/play?url=${encodeURIComponent(streamUrl)}`, // Infuse URL scheme
        };

        // Get the corresponding URL for the selected player
        const playerUrl = playerUrls[player];

        if (!playerUrl) return; 

        Linking.canOpenURL(playerUrl).then((supported) => {
            if (supported) {
                Linking.openURL(playerUrl); // Open the player with the stream URL
            } else {
                console.log(`App for player ${player} is not installed or cannot open the URL.`);
            }
        }).catch((error) => {
            console.error("Error checking URL scheme:", error);
        });
    };

    const renderStreamItem = ({ item }: any) => {
        const { name, title, url, description } = item;

        const isExpanded = expandedStream === item;
        const players = ['vlc', 'infuse', 'vidhub', 'outplayer'];

        return (
            <RNView style={styles.streamItemContainer}>
                <TouchableOpacity
                    style={styles.streamItem}
                    onPress={() => handleStreamExpand(item)}
                >
                    <Text style={styles.streamName} numberOfLines={2}>
                        {name}
                    </Text>
                    <Text style={styles.streamTitle} numberOfLines={2}>
                        {title || description}
                    </Text>

                    {isExpanded && (
                        <RNView style={styles.playerIconsContainer}>
                            {players.map((player: string) => (
                                <TouchableOpacity key={player} onPress={() => handleOpenPlayer(player, url)}>
                                    <Image
                                        source={playerIcons[player]} // Use the mapped player icon
                                        style={styles.playerIcon}
                                    />
                                </TouchableOpacity>
                            ))}
                        </RNView>
                    )}
                </TouchableOpacity>
            </RNView>
        );
    };

    // Get streams for the selected addon
    const selectedAddonStreams = streams.find((addonData) => addonData.addon === selectedAddon)?.streams || [];

    return (
        <RNView style={styles.container}>
            {loading ? (
                <RNView style={styles.loadingContainer}>
                    <Text>Loading...</Text>
                </RNView>
            ) : (
                <>
                    <FlatList
                        data={addons}
                        renderItem={renderAddonItem}
                        keyExtractor={(item, index) => index.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.addonList}
                    />
                    <FlatList
                        data={selectedAddonStreams} // Only show streams from the selected addon
                        renderItem={renderStreamItem}
                        showsVerticalScrollIndicator={false}
                        keyExtractor={(item, index) => index.toString()}
                    />
                </>
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
        marginVertical: 30,
        marginHorizontal: 20
    },
    addonItem: {
        alignItems: 'center',
        marginRight: 20,
    },
    addonIcon: {
        width: 50,
        height: 50,
        borderRadius: 10,
        marginBottom: 5,
    },
    addonName: {
        paddingVertical: 5,
        fontWeight: 'bold'
    },
    streamItemContainer: {
        marginVertical: 15,
        alignItems: 'center',
        width: '100%',
    },
    streamItem: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderRadius: 8,
        width: '100%',
        borderColor: 'gray',
        borderWidth: 1,
    },
    streamName: {
        fontSize: 14,
        flex: 1,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    streamTitle: {
        fontSize: 14,
        flex: 1,
    },
    playerIconsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        padding: 10,
        width: '100%',
    },
    playerIcon: {
        width: 40,
        height: 40,
        borderRadius: 10
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default StreamScreen;
