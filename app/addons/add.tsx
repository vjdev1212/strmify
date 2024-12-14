import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Image, SafeAreaView, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View, TextInput } from '@/components/Themed';
import { Link, router } from 'expo-router';

export default function AddAddonScreen() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [manifestData, setManifestData] = useState<any>(null);

    const fetchManifest = async () => {
        if (!url) {
            Alert.alert('Error', 'Please enter a URL.');
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
            console.log(data);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    const addAddon = async () => {
        if (!manifestData) return;

        try {
            const storedAddons = await AsyncStorage.getItem('addons');
            const addons = storedAddons ? JSON.parse(storedAddons) : {};
            const newKey = `addon-${Date.now()}`;

            const updatedAddons = {
                ...addons,
                [newKey]: manifestData,
            };

            await AsyncStorage.setItem('addons', JSON.stringify(updatedAddons));
            Alert.alert('Success', 'Addon added successfully!');
            setManifestData(null);
            setUrl('');
        } catch (error) {
            Alert.alert('Error', 'Failed to save addon.');
        }
    };

    const isPresented = router.canGoBack();

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
                />
                <View style={styles.fetchButton}>
                    <TouchableOpacity onPress={fetchManifest}>
                        <Text style={styles.fetchButtonText}>Fetch</Text>
                    </TouchableOpacity>
                </View>

                {loading && <ActivityIndicator size="large" color="#fc7703" style={styles.loading} />}

                {manifestData && (
                    <View style={styles.dataContainer}>
                        {manifestData.logo && (
                            <Image
                                source={{ uri: manifestData.logo }}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        )}
                        <View style={styles.dataRow}>
                            <Text style={styles.label}>Name</Text>
                            <Text style={styles.value}>{manifestData.name || 'N/A'}</Text>
                        </View>
                        <View style={styles.dataRow}>
                            <Text style={styles.label}>Version</Text>
                            <Text style={styles.value}>{manifestData.version || 'N/A'}</Text>
                        </View>
                        <View style={styles.dataRow}>
                            <Text style={styles.label}>Description</Text>
                            <Text style={styles.value}>{manifestData.description || 'N/A'}</Text>
                        </View>
                        <View style={styles.dataRow}>
                            <Text style={styles.label}>Types</Text>
                            <Text style={styles.value}>{manifestData.types?.join(', ') || 'N/A'}</Text>
                        </View>
                        <View style={styles.dataRow}>
                            <Text style={styles.label}>Catalogs</Text>
                            <Text style={styles.value}>{manifestData.catalogs?.join(', ') || 'N/A'}</Text>
                        </View>
                    </View>
                )}

                {!isPresented && <Link href="../">Dismiss modal</Link>}

                <View lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
                <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
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
        marginTop: 10,
        padding: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        paddingHorizontal: 10,
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
        marginTop: 20,
        width: '100%',
    },
    dataRow: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
    },
    value: {
        fontSize: 14,
        color: 'gray',
    },
    logo: {
        width: 150,
        height: 150,
        alignSelf: 'center',
        marginBottom: 20,
    },
    fetchButton: {
        alignItems: 'center',
    },
    fetchButtonText: {
        backgroundColor: '#fc7703',
        padding: 12,
        borderRadius: 8,
        width: 150,
        marginTop: 20,
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
