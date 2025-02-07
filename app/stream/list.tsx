import React, { useEffect, useState } from 'react';
import { StyleSheet, Pressable, View as RNView, ScrollView, useColorScheme, useWindowDimensions } from 'react-native';
import { ActivityIndicator, Card, StatusBar, Text, View } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const StreamScreen = () => {
    const { imdbid, type, name: contentTitle, season, episode } = useLocalSearchParams();
    const [addons, setAddons] = useState<any[]>([]);
    const [selectedAddon, setSelectedAddon] = useState<any | null>(null);
    const [streams, setStreams] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const colorScheme = useColorScheme();
    const { width, height } = useWindowDimensions();
    const isPortrait = height > width;

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
                showAlert('Error', 'Failed to load addons');
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
            showAlert('Error', 'Failed to load streams');
        } finally {
            setLoading(false);
        }
    };

    const RenderAddonItem = ({ item }: any) => {
        const { name, logo, types } = item;

        if (!types || !types.includes(type)) {
            return null;
        }

        const isSelected = item.name === selectedAddon?.name;
        return (
            <Pressable
                style={[
                    styles.addonItem,
                    {
                        backgroundColor: !isSelected && colorScheme === 'dark' ? '#101010' : '#f0f0f0',
                    },
                    isSelected && styles.selectedAddonItem,
                ]}
                onPress={async () => {
                    if (isHapticsSupported()) {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
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

    const RenderStreamItem = ({ item }: any) => {
        const { name, title, url, infoHash, description } = item;

        const handleStreamSelected = async () => {
            if (isHapticsSupported()) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
            }
            router.push({
                pathname: '/stream/details',
                params: {
                    imdbid, type, season, episode, contentTitle, name, title, description, url, infoHash
                },
            })
        }

        return (
            <RNView style={[{
                marginHorizontal: 'auto',
                marginVertical: 10,
                justifyContent: 'space-evenly',
                width: '98%',
                maxWidth: 560,
                alignSelf: 'center'
            }]}>
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
        <SafeAreaView style={styles.container}>
            <StatusBar />
            {
                addons?.length > 0 ? (
                    <View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.addonListContainer}>
                            {
                                addons.map((item, index) => (
                                    <RenderAddonItem key={index} item={item} />
                                ))
                            }
                        </ScrollView>
                    </View>
                ) : (
                    <RNView style={styles.loadingContainer}>
                        <View style={styles.centeredContainer}>
                            <Feather style={styles.noAddons} name='alert-circle' color="#535aff" size={70} />
                            <Text style={[styles.noAddonsText, {
                                color: colorScheme === 'dark' ? '#a0a0a0' : '#303030'
                            }]}>
                                No addons have been found. Please ensure that you have configured the addons before searching.
                            </Text>
                        </View>
                    </RNView>
                )
            }
            {
                loading ? (
                    <RNView style={styles.loadingContainer}>
                        <View style={styles.centeredContainer}>
                            <ActivityIndicator size="large" style={styles.activityIndicator} color="#535aff" />
                            <Text style={styles.centeredText}>Loading</Text>
                        </View>
                    </RNView>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.streamsContainer}>
                            {
                                selectedAddonStreams.length > 0 ? (
                                    selectedAddonStreams.map((item: any, index: number) =>
                                    (
                                        <RenderStreamItem key={index} item={item} />
                                    ))
                                ) : (
                                    <>
                                        {
                                            addons.length > 0 && (
                                                <View style={styles.centeredContainer}>
                                                    <Feather style={styles.noStreams} name='alert-circle' color="#535aff" size={50} />
                                                    <Text style={[styles.noStreamsText, {
                                                        color: colorScheme === 'dark' ? '#a0a0a0' : '#303030'
                                                    }]}>
                                                        No streams found!
                                                    </Text>
                                                </View>
                                            )
                                        }

                                    </>
                                )
                            }
                        </View>
                    </ScrollView>
                )
            }
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 40
    },
    addonListContainer: {
        marginVertical: 20,
        marginHorizontal: '5%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    addonList: {
        paddingHorizontal: 10,
    },
    addonItem: {
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginHorizontal: 5,
    },
    selectedAddonItem: {
        backgroundColor: '#535aff',
    },
    addonName: {
        fontSize: 15,
    },
    selectedaddonName: {
        color: '#fff',
    },
    streamsContainer: {
        flexGrow: 0,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-evenly',
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
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    streamTitle: {
        fontSize: 13,
        paddingHorizontal: 10,
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
        textAlign: 'center',
    },
    noStreams: {
        marginTop: 150,
        paddingBottom: 20
    },
    noStreamsText: {
        fontSize: 16,
        textAlign: 'center',
        marginHorizontal: '10%',
        color: '#888'
    },
    noAddons: {
        marginTop: 100,
        paddingBottom: 20
    },
    noAddonsText: {
        fontSize: 16,
        textAlign: 'center',
        marginHorizontal: '10%',
        color: '#888'
    }
});

export default StreamScreen;
