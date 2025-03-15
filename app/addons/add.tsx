import React, { useState } from 'react';
import { StyleSheet, ActivityIndicator, Alert, Pressable, Image, SafeAreaView, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View, TextInput, StatusBar } from '@/components/Themed';
import { router } from 'expo-router';
import { showAlert } from '@/utils/platform';
import { useColorScheme } from '@/components/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';

const defaultAddonLogo = 'https://i.ibb.co/fSJ42PJ/addon.png';

export default function AddAddonScreen() {

    const colorScheme = useColorScheme();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [manifestData, setManifestData] = useState<any>(null);

    const fetchManifest = async () => {
        if (!url) {
            return;
        }

        if (!url.toLocaleLowerCase().endsWith('manifest.json')) {
            showAlert('Invalid Manifest URL', 'Please enter the valid Addon manifest URL.');
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
            showAlert('Error', error.message || 'Failed to fetch data.');
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
            showAlert('Success', 'Addon added successfully!');
            setManifestData(null);
            setUrl('');
            router.navigate({ pathname: '/(tabs)/addons' });
        } catch (error) {
            showAlert('Error', 'Failed to save addon.');
        }
    };

    return (
        <LinearGradient colors={['#111111', '#222222']} start={[0, 0]} end={[1, 0]} style={{ flex: 1 }}>

            <SafeAreaView style={styles.container}>
                <StatusBar />
                <View style={styles.inputContainer}>
                    <Text style={styles.title}>Add Addon</Text>
                    <TextInput
                        style={[
                            styles.input,
                            colorScheme === 'dark' ? styles.darkInput : styles.lightInput,
                        ]}
                        placeholder="Enter manifest.json URL"
                        placeholderTextColor="#B0B0B0"
                        value={url}
                        onChangeText={setUrl}
                        autoCapitalize="none"
                        keyboardType="url"
                        onBlur={fetchManifest}
                        numberOfLines={3}
                        submitBehavior={'blurAndSubmit'}
                    />
                </View>

                {loading && <ActivityIndicator size="large" color="#ffffff" style={styles.loading} />}

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollViewContent}>
                    {manifestData && (
                        <View style={styles.dataContainer}>
                            <Pressable style={styles.addButton} onPress={addAddon}>
                                <Text style={styles.addButtonText}>+ Add Addon</Text>
                            </Pressable>
                            {manifestData.logo && (
                                <Image
                                    source={{
                                        uri: manifestData.logo.match(/\.(png|jpg|jpeg)$/i)
                                            ? manifestData.logo
                                            : defaultAddonLogo,
                                    }}
                                    style={[styles.logo, {
                                        backgroundColor: colorScheme === 'dark' ? '#101010' : '#f0f0f0',
                                    }]}
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
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        maxWidth: 780,
        margin: 'auto',
        paddingTop: 30,
        marginTop: 30,
    },
    inputContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20
    },
    scrollViewContent: {
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        height: 40,
        borderRadius: 12,
        paddingLeft: 20,
        fontSize: 14,
    },
    lightInput: {
        backgroundColor: '#f0f0f0',
        color: '#000',
    },
    darkInput: {
        backgroundColor: '#1f1f1f',
        color: '#fff',
    },
    loading: {
        marginVertical: 20,
    },
    dataContainer: {
        borderRadius: 10,
        paddingHorizontal: 20,
    },
    logo: {
        width: 100,
        height: 100,
        alignSelf: 'center',
        marginBottom: 20,
        borderRadius: 8,
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
        paddingVertical: 12,
        borderRadius: 50,
        marginVertical: 20,
        paddingHorizontal: 30,
        margin: 'auto',        
        borderColor: '#fff',
        borderWidth: StyleSheet.hairlineWidth
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
    },
});
