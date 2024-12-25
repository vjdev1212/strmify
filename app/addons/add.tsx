import React, { useState } from 'react';
import { StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Image, SafeAreaView, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View, TextInput } from '@/components/Themed';
import { router } from 'expo-router';

const defaultAddonLogo = 'https://i.ibb.co/fSJ42PJ/addon.png';

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
    };

    const addAddon = async () => {
        if (!manifestData) return;

        try {
            manifestData.manifestUrl = url;
            manifestData.baseUrl = getBaseUrl(url);
            manifestData.streamBaseUrl = url.replace('/manifest.json', '');
            manifestData.logo = manifestData?.logo?.match(/\.(png|jpg|jpeg)$/i) ? manifestData.logo : defaultAddonLogo;
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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollViewContent}>
                <Text style={styles.title}>Add Addon</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter manifest.json URL"
                    placeholderTextColor="#B0B0B0"
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                    onBlur={fetchManifest}
                    numberOfLines={3}
                />

                {loading && <ActivityIndicator size="large" color="#535aff" style={styles.loading} />}

                {manifestData && (
                    <View style={styles.dataContainer}>
                        <TouchableOpacity style={styles.addButton} onPress={addAddon}>
                            <Text style={styles.addButtonText}>+ Add Addon</Text>
                        </TouchableOpacity>

                        {manifestData.logo && (
                            <Image
                                source={{
                                    uri: manifestData.logo.match(/\.(png|jpg|jpeg)$/i)
                                        ? manifestData.logo
                                        : defaultAddonLogo,
                                }}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        )}

                        <View style={styles.dataInfo}>
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
    scrollViewContent: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        height: 50,
        borderColor: '#888',
        borderWidth: 1,
        borderRadius: 30,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 20,
    },
    loading: {
        marginVertical: 20,
    },
    dataContainer: {
        marginTop: 20,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        padding: 20,
    },
    logo: {
        width: 100,
        height: 100,
        alignSelf: 'center',
        marginBottom: 20,
    },
    dataInfo: {
        marginTop: 10,
    },
    dataRow: {
        marginBottom: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        paddingVertical: 4
    },
    value: {
        fontSize: 14,
        paddingVertical: 4
    },
    addButton: {
        backgroundColor: '#535aff',
        paddingVertical: 12,
        borderRadius: 50,
        alignItems: 'center',
        marginBottom: 20,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
