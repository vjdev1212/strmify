import React, { useState } from 'react';
import { StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Text, View, StatusBar } from '@/components/Themed';
import { router } from 'expo-router';
import { showAlert } from '@/utils/platform';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { useTheme } from '@/context/ThemeContext';
import { NativeTextInput } from '@/components/native-ui-controls';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import { Ionicons } from '@expo/vector-icons';

const defaultAddonLogo = 'https://i.ibb.co/fSJ42PJ/addon.png';
const ADDONS_KEY = StorageKeys.ADDONS_KEY;

export default function AddAddonScreen() {
    const { colors } = useTheme();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [manifestData, setManifestData] = useState<any>(null);

    const fetchManifest = async () => {
        if (!url.trim()) return;
        const refinedUrl = url.trim().replace(/^stremio:\/\//i, 'https://');
        setUrl(refinedUrl);
        if (!refinedUrl.toLowerCase().endsWith('manifest.json')) {
            showAlert('Invalid Manifest URL', 'Please enter the valid Addon manifest URL.');
            return;
        }
        setLoading(true);
        setManifestData(null);
        try {
            const response = await fetch(refinedUrl);
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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar />
            <SettingsPage>
                <SettingsSection title="Manifest URL" footer="Install a Stremio-compatible add-on by pasting its URL ending in manifest.json. Stremio links are supported.">
                    <View style={styles.inputContent}>
                        <NativeTextInput
                            style={{ width: '100%' }}
                            inputStyle={{ width: '100%', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.primarySurface }}
                            textStyle={{ color: colors.text, fontSize: 16 }}
                            seedColor={colors.primary}
                            accessibilityLabel="Addon manifest URL"
                            placeholder="https://example.com/manifest.json"
                            placeholderTextColor={colors.textDim}
                            value={url}
                            onChangeText={setUrl}
                            autoCapitalize="none"
                            keyboardType="url"
                            onSubmitEditing={fetchManifest}
                            returnKeyType="go"
                        />
                    </View>
                    <SettingsRow
                        title={loading ? 'Fetching Add-on…' : 'Preview Add-on'}
                        onPress={fetchManifest}
                        isLast
                        leading={<Ionicons name="search-outline" size={20} color={colors.primary} />}
                        trailing={loading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-forward" size={17} color={colors.textDim} />}
                    />
                </SettingsSection>
                {manifestData ? (
                    <SettingsSection title="Add-on Details">
                        <View style={styles.addonSummary}>
                            <Image
                                source={{ uri: manifestData.logo?.match(/\.(png|jpg|jpeg)$/i) ? manifestData.logo : defaultAddonLogo }}
                                style={styles.logo}
                                resizeMode="cover"
                            />
                            <View style={styles.addonText}>
                                <Text style={[styles.addonName, { color: colors.text }]}>{manifestData.name || 'Unknown Add-on'}</Text>
                                <Text style={[styles.description, { color: colors.textMuted }]}>
                                    {[manifestData.version ? `Version ${manifestData.version}` : null, manifestData.types?.join(' · ')].filter(Boolean).join(' · ')}
                                </Text>
                            </View>
                        </View>
                        {manifestData.description ? (
                            <Text style={[styles.manifestDescription, { color: colors.textMuted }]}>{manifestData.description}</Text>
                        ) : null}
                        <SettingsRow
                            title="Install Add-on"
                            onPress={addAddon}
                            isLast
                            leading={<Ionicons name="add-circle-outline" size={20} color={colors.primary} />}
                            trailing={<Ionicons name="chevron-forward" size={17} color={colors.textDim} />}
                        />
                    </SettingsSection>
                ) : null}
            </SettingsPage>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inputContent: { padding: 12 },
    addonSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    logo: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#333' },
    addonText: { flex: 1, gap: 4 },
    addonName: { fontSize: 16, fontWeight: '600' },
    description: { fontSize: 13, lineHeight: 18 },
    manifestDescription: { fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 14 },
});