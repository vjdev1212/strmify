import React, { useState } from 'react';
import { StyleSheet, ActivityIndicator, Alert, Pressable, Image, ScrollView } from 'react-native';
import { Text, View, TextInput, StatusBar } from '@/components/Themed';
import { router } from 'expo-router';
import { showAlert } from '@/utils/platform';
import { useColorScheme } from '@/components/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageKeys, storageService } from '@/utils/StorageService';

const defaultAddonLogo = 'https://i.ibb.co/fSJ42PJ/addon.png';

const ADDONS_KEY = StorageKeys.ADDONS_KEY;

export default function AddAddonScreen() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [manifestData, setManifestData] = useState<any>(null);

    const fetchManifest = async () => {
        if (!url) {
            return;
        }

        let refinedUrl = url.replace('stremio://', 'https://').trim();

        setUrl(refinedUrl);

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
            const storedAddons = await storageService.getItem(ADDONS_KEY);
            const addons = storedAddons ? JSON.parse(storedAddons) : {};
            const newKey = `${manifestData.id}`;

            const updatedAddons = {
                ...addons,
                [newKey]: manifestData,
            };

            await storageService.setItem(ADDONS_KEY, JSON.stringify(updatedAddons));
            showAlert('Success', 'Addon added successfully!');
            setManifestData(null);
            setUrl('');
            router.navigate({ pathname: '/settings/addons' });
        } catch (error) {
            showAlert('Error', 'Failed to save addon.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            
            {/* Header Section */}
            <View style={styles.header}>
                <Text style={styles.title}>Add New Addon</Text>
                <Text style={styles.subtitle}>Discover and install addons to enhance your experience</Text>
            </View>

            {/* Input Section */}
            <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Manifest URL</Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        placeholder="https://example.com/manifest.json"
                        placeholderTextColor="#666666"
                        value={url}
                        onChangeText={setUrl}
                        autoCapitalize="none"
                        keyboardType="url"
                        onSubmitEditing={fetchManifest}
                        numberOfLines={1}
                        returnKeyType="go"
                        submitBehavior="blurAndSubmit"
                    />
                </View>
            </View>

            {/* Loading State */}
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.loadingText}>Fetching addon details...</Text>
                </View>
            )}

            {/* Content Section */}
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
                style={styles.scrollView}
            >
                {manifestData && (
                    <View style={styles.addonCard}>
                        {/* Addon Header */}
                        <View style={styles.addonHeader}>
                            <View style={styles.logoContainer}>
                                <Image
                                    source={{
                                        uri: manifestData.logo?.match(/\.(png|jpg|jpeg)$/i)
                                            ? manifestData.logo
                                            : defaultAddonLogo,
                                    }}
                                    style={styles.logo}
                                    resizeMode="cover"
                                />
                            </View>
                            <View style={styles.addonTitleContainer}>
                                <Text style={styles.addonName}>
                                    {manifestData.name || 'Unknown Addon'}
                                </Text>
                                {manifestData.version && (
                                    <View style={styles.versionBadge}>
                                        <Text style={styles.versionText}>v{manifestData.version}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Description */}
                        {manifestData.description && (
                            <View style={styles.descriptionContainer}>
                                <Text style={styles.description}>{manifestData.description}</Text>
                            </View>
                        )}

                        {/* Types */}
                        {manifestData.types && manifestData.types.length > 0 && (
                            <View style={styles.typesContainer}>
                                <Text style={styles.typesLabel}>Supported Types</Text>
                                <View style={styles.typesWrapper}>
                                    {manifestData.types.map((type: string, index: number) => (
                                        <View key={index} style={styles.typeTag}>
                                            <Text style={styles.typeText}>{type}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Add Button */}
                        <Pressable 
                            style={[styles.addButton, styles.addButtonShadow]} 
                            onPress={addAddon}
                        >
                            <Text style={styles.addButtonText}>Install Addon</Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        marginTop: 30,
        maxWidth: 780,
        alignSelf: 'center',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 8,
    },
    title: {
        fontSize: 30,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#888888',
        lineHeight: 22,
    },
    inputSection: {
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    inputWrapper: {
        width: '100%',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    input: {
        width: '100%',
        height: 44,
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 15,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#888888',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    addonCard: {
        backgroundColor: '#111111',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#222222',
    },
    addonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        marginRight: 16,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    addonTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    addonName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#ffffff',
        flex: 1,
        marginRight: 12,
    },
    versionBadge: {
        backgroundColor: '#2a2a2a',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    versionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#888888',
    },
    descriptionContainer: {
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    description: {
        fontSize: 16,
        color: '#cccccc',
        lineHeight: 24,
    },
    typesContainer: {
        marginBottom: 32,
    },
    typesLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 12,
    },
    typesWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typeTag: {
        backgroundColor: '#1a1a1a',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333333',
    },
    typeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#888888',
    },
    addButton: {
        backgroundColor: '#535aff',
        paddingVertical: 14,
        paddingHorizontal: 26,
        borderRadius: 12,
        alignItems: 'center',
        alignSelf: 'center',
        minWidth: 140,
    },
    addButtonShadow: {
        shadowColor: 'rgba(83, 90, 255, 0.75)',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    addButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
});