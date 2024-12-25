import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Pressable, View as RNView, Alert, Platform } from 'react-native';
import { ActivityIndicator, Card, Text, View } from '@/components/Themed';
import { router, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const StreamScreen = () => {
    const { imdbid, type, season, episode } = useLocalSearchParams();
    const [addons, setAddons] = useState<any[]>([]);
    const [selectedAddon, setSelectedAddon] = useState<any | null>(null);
    const [streams, setStreams] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchAddons = async () => {
            try {
                const storedAddons = await AsyncStorage.getItem('addons');
                const addonsData = storedAddons ? JSON.parse(storedAddons) : {};
                const addonList = Object.values(addonsData);
                setAddons(addonList);


                if (addonList.length > 0) {
                    setSelectedAddon(addonList[0]);
                    fetchStreams(addonList);
                }
            } catch (error) {
                console.error('Error fetching addons:', error);
                Alert.alert('Error', 'Failed to load addons');
            }
        };

        fetchAddons();
    }, []);

    const fetchStreams = async (addonList: any[]) => {
        setLoading(true);
        const fetchWithTimeout = (url: string, timeout = 10000) => {
            return Promise.race([
                fetch(url).then((response) => response.json()),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timed out')), timeout)
                ),
            ]);
        };

        try {
            const addonPromises = addonList.map(async (addon) => {
                const addonTypes = addon?.types || [];


                if (!addonTypes.includes(type)) {
                    return { addon, streams: [] };
                }

                const addonUrl = addon?.url || '';
                const streamBaseUrl = addon?.streamBaseUrl || addonUrl;
                let streamUrl = '';

                if (type === 'series') {
                    streamUrl = `${streamBaseUrl}/stream/series/${imdbid}${season && episode ? `:${season}:${episode}` : ''}.json`;
                } else {
                    streamUrl = `${streamBaseUrl}/stream/${type}/${imdbid}.json`;
                }

                try {
                    const data = await fetchWithTimeout(streamUrl, 10000);
                    return { addon, streams: data.streams || [] };
                } catch (error) {
                    console.error(`Error fetching streams for addon "${addon?.name}":`, error);
                    return { addon, streams: [] };
                }
            });


            const allStreams = await Promise.all(addonPromises);

            setStreams(allStreams);

        } catch (error) {
            console.error('Error fetching streams:', error);
            Alert.alert('Error', 'Failed to load streams');
        } finally {
            setLoading(false);
        }
    };


    const renderAddonItem = ({ item }: any) => {
        const { name, logo, types } = item;


        if (!types || !types.includes(type)) {
            return null;
        }

        const isSelected = item.name === selectedAddon?.name;
        return (
            <Pressable
                style={[
                    styles.addonItem,
                    isSelected && styles.selectedAddonItem,
                ]}
                onPress={async () => {
                    if (Platform.OS !== 'web') {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setSelectedAddon(item);
                    fetchStreams([item]);
                }}
            >
                <Text
                    style={[
                        styles.addonName,
                        isSelected && styles.selectedaddonName,
                    ]}
                    numberOfLines={1}
                >
                    {name}
                </Text>
            </Pressable>
        );
    };

    const renderStreamItem = ({ item }: any) => {
        const { name, title, url, infoHash, description } = item;

        const handleStreamSelected = async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
            router.push({
                pathname: '/stream/details',
                params: {
                    name, title, description, url, infoHash
                },
            })
        }

        return (
            <RNView style={styles.streamItemContainer}>
                <Pressable onPress={handleStreamSelected}>
                    <Card style={styles.streamItem}>
                        <Text style={styles.streamName} numberOfLines={2}>
                            {name}
                        </Text>
                        <Text style={styles.streamTitle}>
                            {title || description}
                        </Text>
                    </Card>
                </Pressable>
            </RNView>
        );
    };

    const selectedAddonStreams = streams.find((addonData) => addonData.addon === selectedAddon)?.streams || [];
    return (
        <RNView style={styles.container}>
            <View>
                <View style={styles.addonListContainer}>
                    <FlatList
                        style={styles.addonList}
                        data={addons}
                        renderItem={renderAddonItem}
                        keyExtractor={(item, index) => index.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    />
                </View>
            </View>
            {loading ? (
                <RNView style={styles.loadingContainer}>
                    <View style={styles.centeredContainer}>
                        <ActivityIndicator size="large" style={styles.activityIndicator} color="#535aff" />
                        <Text style={styles.centeredText}>Loading</Text>
                    </View>
                </RNView>
            ) : (
                <View>
                    {
                        selectedAddonStreams.length === 0 ? (
                            <Text style={styles.noStreams}>No streams found</Text>
                        ) : (
                            <FlatList
                                data={selectedAddonStreams}
                                renderItem={renderStreamItem}
                                showsVerticalScrollIndicator={false}
                                keyExtractor={(item, index) => index.toString()}
                            />
                        )
                    }
                </View>
            )}
        </RNView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    addonListContainer: {
        marginVertical: 20,
        marginHorizontal: 10,
    },
    addonList: {
        paddingHorizontal: 10,
    },
    addonItem: {
        marginHorizontal: 5,
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 30
    },
    selectedAddonItem: {
        backgroundColor: '#535aff',
    },
    addonName: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    selectedaddonName: {
        fontWeight: 'bold',
        color: '#fff',
    },
    streamItemContainer: {
        width: '100%',
    },
    streamItem: {
        paddingHorizontal: 10,
        paddingVertical: 20,
        marginVertical: 10,
        marginHorizontal: 20,
        borderRadius: 10,
    },
    streamName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    streamTitle: {
        fontSize: 13,
        paddingHorizontal: 10,
        color: '#888',
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
        borderRadius: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityIndicator: {
        marginBottom: 10,
        color: '#535aff',
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    centeredText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    noStreams: {
        marginTop: '25%',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default StreamScreen;