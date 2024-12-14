import { View, Text, TextInput } from '@/components/Themed';
import { useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ScrollView, Linking, Alert, SafeAreaView } from 'react-native';

const StreamListScreen = () => {
    const { imdbId, season, episode } = useLocalSearchParams();
    const [selectedAddon, setSelectedAddon] = useState(null);
    const [addons, setAddons] = useState<any[]>([]);
    const [addonStreams, setAddonStreams] = useState({});

    useEffect(() => {
        // Example addon data - replace this with fetching addons
        const fetchedAddons = [
            { id: 'addon1', name: 'Addon 1', types: ['movie'], streamBaseUrl: 'https://example.com' },
            { id: 'addon2', name: 'Addon 2', types: ['series'], streamBaseUrl: 'https://example2.com' },
            { id: 'addon3', name: 'Addon 3', types: ['movie', 'series'], streamBaseUrl: 'https://example3.com' },
            // Add more addons as needed
        ];
        setAddons(fetchedAddons);

        // Trigger search when the screen loads
        searchStreams(fetchedAddons);
    }, []);

    const searchStreams = async (availableAddons: any[]) => {
        if (!imdbId || (!season && !episode)) {
            Alert.alert('Error', 'Please provide IMDb ID and Season/Episode (if series).');
            return;
        }

        const type = season && episode ? 'series' : 'movie'; // Determine type
        const searchPromises = availableAddons
            .filter(addon => addon.types.includes(type)) // Filter addons that support the type
            .map(addon => fetchStreams(addon, type));

        try {
            const results = await Promise.all(searchPromises);
            const streamsByAddon = results.reduce((acc: any, { addon, streams }) => {
                acc[addon.id] = streams;
                return acc;
            }, {});
            setAddonStreams(streamsByAddon);
            setSelectedAddon(null); // Reset selection
        } catch (error) {
            console.error('Error fetching streams:', error);
            Alert.alert('Error', 'Failed to fetch streams.');
        }
    };

    const fetchStreams = async (addon: any, type: string) => {
        const url =
            type === 'movie'
                ? `${addon.streamBaseUrl}/stream/movie/${imdbId}.json`
                : `${addon.streamBaseUrl}/stream/series/${imdbId}:${season}:${episode}.json`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            return { addon, streams: data.streams || [] }; // Assuming response has `streams` array
        } catch (error) {
            console.error(`Error fetching streams for ${addon.name}:`, error);
            return { addon, streams: [] };
        }
    };

    const renderAddonItem = ({ item }: any) => (
        <TouchableOpacity
            style={[styles.addonItem, selectedAddon === item.id ? styles.selectedAddon : {}]}
            onPress={() => setSelectedAddon(item.id)}
        >
            <Text style={styles.addonName}>{item.name}</Text>
        </TouchableOpacity>
    );

    const renderStreamItem = (stream: any, addonId: string) => (
        <View style={styles.streamItem}>
            <Text style={styles.streamName}>{stream.name}</Text>
            <Text style={styles.streamDescription}>{stream.description}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(stream.URL)}>
                <Text style={styles.streamUrl}>{stream.URL}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderAddonStreams = () => {
        if (!selectedAddon) return null;
        const streams = addonStreams[selectedAddon] || [];
        return (
            <FlatList
                data={streams}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => renderStreamItem(item, selectedAddon)}
                contentContainerStyle={styles.streamList}
            />
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                {/* Addon List */}
                <FlatList
                    data={addons}
                    horizontal
                    keyExtractor={(item) => item.id}
                    renderItem={renderAddonItem}
                    contentContainerStyle={styles.addonList}
                />
                {/* Render streams for selected addon */}
                {renderAddonStreams()}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20,
    },
    scrollViewContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    addonList: {
        marginBottom: 20,
    },
    addonItem: {
        marginRight: 15,
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
    },
    selectedAddon: {
        backgroundColor: '#fc7703',
    },
    addonName: {
        fontWeight: 'bold',
    },
    streamList: {
        marginBottom: 20,
    },
    streamItem: {
        padding: 10,
        backgroundColor: '#f9f9f9',
        marginBottom: 10,
        borderRadius: 5,
    },
    streamName: {
        fontWeight: 'bold',
    },
    streamDescription: {
        color: '#777',
        marginBottom: 5,
    },
    streamUrl: {
        color: '#1e90ff',
        textDecorationLine: 'underline',
    },
});

export default StreamListScreen;
