import React, { useState } from 'react';
import { StyleSheet, ActivityIndicator, Pressable, Image, ScrollView } from 'react-native';
import { Text, View, TextInput, StatusBar } from '@/components/Themed';
import { router } from 'expo-router';
import { showAlert } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { useTheme } from '@/context/ThemeContext';

const defaultAddonLogo = 'https://i.ibb.co/fSJ42PJ/addon.png';
const ADDONS_KEY = StorageKeys.ADDONS_KEY;

export default function AddAddonScreen() {
    const { colors } = useTheme();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [manifestData, setManifestData] = useState<any>(null);

    const fetchManifest = async () => {
        if (!url) return;
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
            if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
            setManifestData(await response.json());
        } catch (error: any) {
            showAlert('Error', error.message || 'Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    const getBaseUrl = (url: string) => {
        const p = new URL(url);
        return `${p.protocol}//${p.host}`;
    };

    const addAddon = async () => {
        if (!manifestData) return;
        try {
            manifestData.manifestUrl = url;
            manifestData.baseUrl = getBaseUrl(url);
            manifestData.streamBaseUrl = url.replace('/manifest.json', '');
            manifestData.logo = manifestData?.logo?.match(/\.(png|jpg|jpeg)$/i) ? manifestData.logo : defaultAddonLogo;
            const storedAddons = storageService.getItem(ADDONS_KEY);
            const addons = storedAddons ? JSON.parse(storedAddons) : {};
            storageService.setItem(ADDONS_KEY, JSON.stringify({ ...addons, [`${manifestData.id}`]: manifestData }));
            showAlert('Success', 'Addon added successfully!');
            setManifestData(null);
            setUrl('');
            router.navigate({ pathname: '/settings/addons' });
        } catch { showAlert('Error', 'Failed to save addon.'); }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Add New Addon</Text>
                <Text style={[styles.subtitle, { color: colors.textDim }]}>Discover and install addons to enhance your experience</Text>
            </View>
            <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Manifest URL</Text>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder, color: colors.text }]}
                        placeholder="https://example.com/manifest.json"
                        placeholderTextColor={colors.textDim}
                        value={url}
                        onChangeText={setUrl}
                        autoCapitalize="none"
                        keyboardType="url"
                        onSubmitEditing={fetchManifest}
                        returnKeyType="go"
                        submitBehavior="blurAndSubmit"
                    />
                </View>
            </View>
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textDim }]}>Fetching addon details...</Text>
                </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
                {manifestData && (
                    <View style={[styles.addonCard, { borderColor: colors.primaryBorder, backgroundColor: colors.primaryCard }]}>
                        <View style={styles.addonHeader}>
                            <View style={[styles.logoContainer, { backgroundColor: colors.primarySurface }]}>
                                <Image source={{ uri: manifestData.logo?.match(/\.(png|jpg|jpeg)$/i) ? manifestData.logo : defaultAddonLogo }} style={styles.logo} resizeMode="cover" />
                            </View>
                            <View style={styles.addonTitleContainer}>
                                <Text style={[styles.addonName, { color: colors.text }]}>{manifestData.name || 'Unknown Addon'}</Text>
                                {manifestData.version && (
                                    <View style={[styles.versionBadge, { backgroundColor: colors.primarySurface }]}>
                                        <Text style={[styles.versionText, { color: colors.textDim }]}>v{manifestData.version}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        {manifestData.description && (
                            <View style={styles.descriptionContainer}>
                                <Text style={[styles.description, { color: colors.textDim }]}>{manifestData.description}</Text>
                            </View>
                        )}
                        {manifestData.types?.length > 0 && (
                            <View style={styles.typesContainer}>
                                <Text style={[styles.typesLabel, { color: colors.text }]}>Supported Types</Text>
                                <View style={styles.typesWrapper}>
                                    {manifestData.types.map((type: string, index: number) => (
                                        <View key={index} style={[styles.typeTag, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}>
                                            <Text style={[styles.typeText, { color: colors.textDim }]}>{type}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                        <Pressable style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={addAddon}>
                            <Text style={[styles.addButtonText, { color: colors.text }]}>Install Addon</Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, width: '100%', marginTop: 30, maxWidth: 780, alignSelf: 'center' },
    header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
    title: { fontSize: 30, fontWeight: '700', marginBottom: 8 },
    subtitle: { fontSize: 16, lineHeight: 22 },
    inputSection: { paddingHorizontal: 24, paddingVertical: 24 },
    inputWrapper: { width: '100%' },
    inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12, letterSpacing: 0.5 },
    input: { width: '100%', height: 44, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, borderWidth: 1 },
    loadingContainer: { alignItems: 'center', paddingVertical: 40 },
    loadingText: { marginTop: 16, fontSize: 16 },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    addonCard: { borderRadius: 16, padding: 24, borderWidth: StyleSheet.hairlineWidth },
    addonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    logoContainer: { width: 80, height: 80, borderRadius: 20, overflow: 'hidden', marginRight: 16 },
    logo: { width: '100%', height: '100%' },
    addonTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    addonName: { fontSize: 22, fontWeight: '700', flex: 1, marginRight: 12 },
    versionBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    versionText: { fontSize: 12, fontWeight: '600' },
    descriptionContainer: { marginBottom: 24, paddingHorizontal: 4 },
    description: { fontSize: 16, lineHeight: 24 },
    typesContainer: { marginBottom: 32 },
    typesLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
    typesWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeTag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    typeText: { fontSize: 14, fontWeight: '500' },
    addButton: { paddingVertical: 14, paddingHorizontal: 26, borderRadius: 12, alignItems: 'center', alignSelf: 'center', minWidth: 140 },
    addButtonText: { fontSize: 16, fontWeight: '500', letterSpacing: 0.5 },
});