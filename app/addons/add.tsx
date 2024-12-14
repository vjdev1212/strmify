import React, { useState } from 'react';
import { StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Image, SafeAreaView, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View, TextInput } from '@/components/Themed';
import { router } from 'expo-router';

export default function AddAddonScreen() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [manifestData, setManifestData] = useState<any>(null);

    const fetchManifest = async () => {
        if (!url) {
            Alert.alert('Error', 'Please enter a URL.');
            return;
        }

        if (!url.toLocaleLowerCase().endsWith('manifest.json')) {
            Alert.alert('Invalid Manifest URL', 'Please enter the valid Addon manifest URL.');
            return;
        }

        setLoading(true);
        setManifestData(null);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }

            const data = await response.json();
            setManifestData(data);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    const getBaseUrl = (url: string) => {
        const parsedUrl = new URL(url);
        return `${parsedUrl.protocol}//${parsedUrl.host}`;
    }

    const addAddon = async () => {
        if (!manifestData) return;

        try {
            manifestData.manifestUrl = url;
            manifestData.url = getBaseUrl(url);
            const storedAddons = await AsyncStorage.getItem('addons');
            const addons = storedAddons ? JSON.parse(storedAddons) : {};
            const newKey = `${manifestData.id}`;

            const updatedAddons = {
                ...addons,
                [newKey]: manifestData,
            };

            await AsyncStorage.setItem('addons', JSON.stringify(updatedAddons));
            Alert.alert('Success', 'Addon added successfully!');
            setManifestData(null);
            setUrl('');
            router.navigate({ pathname: '/(tabs)/addons' });
        } catch (error) {
            Alert.alert('Error', 'Failed to save addon.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.contentContainer}>
                <Text style={styles.title}>Add Addon</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter manifest.json URL"
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                    onBlur={fetchManifest}
                />

                {loading && <ActivityIndicator size="large" color="#fc7703" style={styles.loading} />}

                {manifestData && (
                    <View style={styles.dataContainer}>
                        <View style={styles.addButton}>
                            <TouchableOpacity onPress={addAddon}>
                                <Text style={styles.addButtonText}>+ Add addon</Text>
                            </TouchableOpacity>
                        </View>

                        {manifestData.logo && (
                            <Image
                                source={{ uri: manifestData.logo }}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        )}

                        {manifestData.name && (
                            <View style={styles.dataRow}>
                                <Text style={styles.label}>Name:</Text>
                                <Text style={styles.value}>{manifestData.name}</Text>
                            </View>
                        )}

                        {manifestData.version && (
                            <View style={styles.dataRow}>
                                <Text style={styles.label}>Version:</Text>
                                <Text style={styles.value}>{manifestData.version}</Text>
                            </View>
                        )}

                        {manifestData.description && (
                            <View style={styles.dataRow}>
                                <Text style={styles.label}>Description:</Text>
                                <Text style={styles.value}>{manifestData.description}</Text>
                            </View>
                        )}

                        {manifestData.types && manifestData.types.length > 0 && (
                            <View style={styles.dataRow}>
                                <Text style={styles.label}>Types:</Text>
                                <Text style={styles.value}>{manifestData.types.join(', ')}</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 10,
    },
    contentContainer: {
        marginTop: 20,
        padding: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        paddingHorizontal: 10,
        textAlign: 'center'
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        marginHorizontal: 10,
        borderRadius: 5,
        paddingHorizontal: 10,
    },
    loading: {
        marginVertical: 20,
    },
    dataContainer: {
        marginTop: 10,
        width: '100%',
        marginBottom: 40,
        padding: 10
    },
    dataRow: {
        marginBottom: 20,
    },
    label: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 5,
    },
    value: {
        fontSize: 14,
    },
    logo: {
        width: 150,
        height: 150,
        alignSelf: 'center',
        marginBottom: 20,
    },
    addButton: {
        alignItems: 'center',
        marginBottom: 10
    },
    addButtonText: {
        backgroundColor: '#fc7703',
        padding: 12,
        borderRadius: 8,
        width: 150,
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20
    },
});
