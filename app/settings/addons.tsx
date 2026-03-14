import React, { useState, useEffect } from 'react';
import { StyleSheet, Pressable, Image, ScrollView, View, Platform, RefreshControl, Dimensions, ActivityIndicator, Share } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar, Text } from '@/components/Themed';
import { router } from 'expo-router';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { useTheme } from '@/context/ThemeContext';

const ADDONS_KEY = StorageKeys.ADDONS_KEY;
const defaultAddonLogo = 'https://i.ibb.co/fSJ42PJ/addon.png';

const AddonsScreen = () => {
  const { colors } = useTheme();
  const [addons, setAddons] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingAddonId, setUpdatingAddonId] = useState<string | null>(null);

  const fetchAddons = async () => {
    try {
      const storedAddons = storageService.getItem(ADDONS_KEY);
      if (storedAddons) {
        const parsed = JSON.parse(storedAddons);
        setAddons(Object.keys(parsed).map(key => ({ id: key, ...parsed[key] })));
      }
    } catch (error) { showAlert('Error', 'Failed to load addons.'); }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchAddons(); setRefreshing(false); };
  useEffect(() => { fetchAddons(); }, []);

  const getBaseUrl = (url: string) => {
    try { const p = new URL(url); return `${p.protocol}//${p.host}`; } catch { return ''; }
  };

  const updateAddonManifest = async (addonId: string, manifestUrl: string) => {
    setUpdatingAddonId(addonId);
    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const manifestData = await response.json();
      const updatedAddon = { ...manifestData, id: addonId, manifestUrl, baseUrl: getBaseUrl(manifestUrl), streamBaseUrl: manifestUrl.replace('/manifest.json', ''), logo: manifestData?.logo?.match(/\.(png|jpg|jpeg)$/i) ? manifestData.logo : defaultAddonLogo };
      const storedAddons = storageService.getItem(ADDONS_KEY);
      const addonsObject = storedAddons ? JSON.parse(storedAddons) : {};
      addonsObject[addonId] = updatedAddon;
      storageService.setItem(ADDONS_KEY, JSON.stringify(addonsObject));
      await fetchAddons();
      showAlert('Success', `${manifestData.name || 'Addon'} updated successfully!`);
    } catch (error: any) { showAlert('Error', error.message || 'Failed to update addon manifest'); }
    finally { setUpdatingAddonId(null); }
  };

  const removeAddon = async (addonId: string) => {
    const updatedAddons = addons.filter(a => a.id !== addonId);
    setAddons(updatedAddons);
    try {
      if (updatedAddons.length === 0) { storageService.removeItem(ADDONS_KEY); }
      else { storageService.setItem(ADDONS_KEY, JSON.stringify(Object.fromEntries(updatedAddons.map(a => [a.id, a])))); }
      showAlert('Success', 'Addon removed successfully!');
    } catch { showAlert('Error', 'Failed to remove addon.'); await fetchAddons(); }
  };

  const openConfiguration = async (url: string) => {
    try { await WebBrowser.openBrowserAsync(`${url}/configure`); }
    catch { showAlert('Error', 'Unable to open configuration URL.'); }
  };

  const shareManifestUrl = async (url: string) => {
    try { await Share.share({ message: url, url }); }
    catch (error: any) { showAlert('Error', 'Failed to share the URL.'); }
  };

  const renderAddonCard = (item: any) => {
    const configurable = item.behaviorHints?.configurable;
    const hasManifestUrl = !!item.manifestUrl;
    const isUpdating = updatingAddonId === item.id;

    return (
      <View style={[styles.addonCard, { borderColor: colors.primaryBorder, backgroundColor: colors.primaryGhost }]} key={item.id}>
        <View style={styles.cardHeader}>
          <Image source={{ uri: item.logo }} style={[styles.addonLogo, { backgroundColor: colors.primarySurface }]} />
          <View style={styles.headerInfo}>
            <Text style={[styles.addonName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.addonTypes, { color: colors.textDim }]} numberOfLines={1}>{item.types?.join(' · ') || 'Unknown'}</Text>
              {item.version && (
                <View style={[styles.versionBadge, { backgroundColor: colors.primarySurface }]}>
                  <Text style={[styles.versionText, { color: colors.textMuted }]}>v{item.version}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {item.description && <View style={styles.cardBody}><Text style={[styles.addonDescription, { color: colors.textMuted }]} numberOfLines={3}>{item.description}</Text></View>}
        <View style={styles.cardActions}>
          {hasManifestUrl && (
            <Pressable style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.primaryGhost }, pressed && styles.actionButtonPressed]} onPress={() => updateAddonManifest(item.id, item.manifestUrl)} disabled={isUpdating}>
              {isUpdating ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="refresh" size={18} color="#ffffff" />}
            </Pressable>
          )}
          <Pressable style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.primaryGhost }, pressed && styles.actionButtonPressed]} onPress={() => shareManifestUrl(item.manifestUrl)}>
            <Ionicons name="share-outline" size={18} color="#ffffff" />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.primaryGhost }, !configurable && { backgroundColor: colors.primaryFaint }, pressed && configurable && styles.actionButtonPressed]} onPress={() => openConfiguration(item.baseUrl)} disabled={!configurable}>
            <Ionicons name="settings-outline" size={18} color={configurable ? "#ffffff" : '#555555'} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionButton, styles.removeButton, pressed && styles.removeButtonPressed]}
            onPress={() => {
              const message = `Remove "${item.name}"?`;
              if (Platform.OS === 'ios' || Platform.OS === 'android') {
                showAlert('Remove Addon', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => removeAddon(item.id) }]);
              } else {
                if (window.confirm(message)) removeAddon(item.id);
              }
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#ff4757" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <View style={[styles.header, { borderBottomColor: colors.primaryBorder }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Addons</Text>
        <Pressable style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary }, pressed && styles.addButtonPressed]} onPress={() => router.push('/settings/add')}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={[styles.addButtonText, { color: colors.text }]}>Add</Text>
        </Pressable>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, addons.length === 0 && styles.emptyContentContainer]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.background} />}
      >
        {addons.length > 0 ? (
          <View style={styles.addonList}>{addons.map((item) => renderAddonCard(item))}</View>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primarySurface }]}>
              <Ionicons name="cube-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Addons</Text>
            <Text style={[styles.emptyStateText, { color: colors.textDim }]}>Get started by adding your first addon</Text>
            <Pressable style={({ pressed }) => [styles.emptyActionButton, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }, pressed && styles.emptyActionButtonPressed]} onPress={() => router.push('/settings/add')}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.emptyActionText, { color: colors.primary }]}>Add Addon</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 30, width: '100%', maxWidth: 700, margin: 'auto' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6 },
  addButtonPressed: { opacity: 0.7 },
  addButtonText: { fontSize: 14, fontWeight: '500', letterSpacing: -0.2 },
  contentContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  emptyContentContainer: { flex: 1, justifyContent: 'center' },
  addonList: { flex: 1, gap: 16 },
  addonCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  addonLogo: { width: 56, height: 56, borderRadius: 14, marginRight: 14 },
  headerInfo: { flex: 1, justifyContent: 'center' },
  addonName: { fontSize: 17, fontWeight: '500', marginBottom: 6, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addonTypes: { fontSize: 13, fontWeight: '500' },
  versionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  versionText: { fontSize: 11, fontWeight: '500' },
  cardBody: { marginBottom: 14 },
  addonDescription: { fontSize: 14, lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  actionButtonPressed: { opacity: 0.6 },
  removeButton: { backgroundColor: 'rgba(255,71,87,0.1)' },
  removeButtonPressed: { opacity: 0.6 },
  disabledButton: {},
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyIconContainer: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyStateTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8, letterSpacing: -0.5 },
  emptyStateText: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emptyActionButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, gap: 8 },
  emptyActionButtonPressed: { opacity: 0.7 },
  emptyActionText: { fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },
});

export default AddonsScreen;