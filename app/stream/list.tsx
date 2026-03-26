import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, Pressable, View as RNView, ScrollView } from 'react-native';
import { ActivityIndicator, Card, StatusBar, Text, View } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { showAlert } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import BottomSpacing from '@/components/BottomSpacing';
import { extractQuality, extractSize, getStreamType } from '@/utils/StreamItem';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { useTheme } from '@/context/ThemeContext';

interface Stream { name: string; title?: string; url?: string; embed?: string; infoHash?: string; magnet?: string; magnetLink?: string; description?: string; }
interface Addon { name: string; url?: string; streamBaseUrl?: string; types?: string[]; }
interface StreamResponse { streams?: Stream[]; }

const ADDONS_KEY = StorageKeys.ADDONS_KEY;

const StreamListScreen = () => {
    const { colors } = useTheme();
    const { imdbid, type, name, title, season, episode } = useLocalSearchParams<{ imdbid: string; type: string; name: string; title: string; season?: string; episode?: string; }>();
    const [addons, setAddons] = useState<Addon[]>([]);
    const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const currentAddonRef = useRef<string>('');
    const router = useRouter();

    const fetchAddons = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            const storedAddons = storageService.getItem(ADDONS_KEY);
            if (!storedAddons) { setAddons([]); return; }
            const addonsData = JSON.parse(storedAddons) as Record<string, Addon>;
            if (!addonsData || Object.keys(addonsData).length === 0) { setAddons([]); return; }
            const addonList = Object.values(addonsData);
            const filteredAddons = addonList.filter((addon: Addon) => addon?.types?.includes(type));
            setAddons(filteredAddons);
            if (filteredAddons.length > 0) {
                const firstAddon = filteredAddons[0];
                setSelectedAddon(firstAddon);
                currentAddonRef.current = firstAddon.name;
                await fetchStreams(firstAddon);
            }
        } catch (error) { showAlert('Error', 'Failed to load addons'); setAddons([]); }
        finally { setLoading(false); }
    }, [type]);

    const fetchStreams = useCallback(async (addon: Addon): Promise<void> => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const requestAddonName = addon.name;
        setStreams([]); setLoading(true);
        try {
            const streamBaseUrl = addon?.streamBaseUrl || addon?.url || '';
            const streamUrl = type === 'series'
                ? `${streamBaseUrl}/stream/series/${imdbid}${season && episode ? `:${season}:${episode}` : ''}.json`
                : `${streamBaseUrl}/stream/${type}/${imdbid}.json`;
            const response = await fetch(streamUrl, { signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json() as StreamResponse;
            if (currentAddonRef.current === requestAddonName && !controller.signal.aborted) { setStreams(data.streams || []); setLoading(false); }
        } catch (error: any) {
            if (error.name !== 'AbortError') { if (currentAddonRef.current === requestAddonName) { setStreams([]); setLoading(false); } }
        }
    }, [imdbid, type, season, episode]);

    useEffect(() => { fetchAddons(); }, [fetchAddons]);
    useEffect(() => () => { if (abortControllerRef.current) abortControllerRef.current.abort(); }, []);

    const handleAddonPress = useCallback(async (item: Addon): Promise<void> => {
        currentAddonRef.current = item.name; setSelectedAddon(item); await fetchStreams(item);
    }, [fetchStreams]);

    const handleStreamSelected = useCallback(async (stream: Stream, index: number): Promise<void> => {
        router.push({ pathname: '/stream/player', params: { streams: JSON.stringify(streams), selectedStreamIndex: index.toString(), title, imdbid, type, season, episode } });
    }, [streams, router, imdbid, type, season, episode]);

    const AddonItem = React.memo<{ item: Addon }>(({ item }) => {
        if (!item.types?.includes(type)) return null;
        const isSelected = item.name === selectedAddon?.name;
        return (
            <Pressable
                style={({ pressed }) => [styles.addonItem, { backgroundColor: isSelected ? colors.primary : colors.primarySurface, borderColor: isSelected ? colors.primary : colors.primaryBorder }, pressed && styles.addonItemPressed]}
                onPress={() => handleAddonPress(item)}
            >
                <Text style={[styles.addonName, { color: isSelected ? colors.text : colors.textMuted }]} numberOfLines={1}>{item.name}</Text>
            </Pressable>
        );
    });

    const StreamItem = React.memo<{ item: Stream; index: number }>(({ item, index }) => {
        const { name, title, description } = item;
        const quality = extractQuality(name, title);
        const size = extractSize(description || title || '');
        const streamType = getStreamType(item);
        return (
            <Pressable onPress={() => handleStreamSelected(item, index)} style={({ pressed }) => [styles.streamContainer, pressed && styles.streamContainerPressed]}>
                <Card style={[styles.streamItem, { borderColor: colors.primaryBorder, backgroundColor: colors.primaryCard }]}>
                    <RNView style={styles.streamHeader}>
                        <Text style={[styles.streamName, { color: colors.text }]} numberOfLines={2}>{name}</Text>
                        {quality && <RNView style={[styles.qualityBadge, { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder }]}><Text style={[styles.qualityText, { color: colors.text }]}>{quality}</Text></RNView>}
                    </RNView>
                    {(title || description) && <Text style={[styles.streamDescription, { color: colors.textMuted }]}>{title || description}</Text>}
                    <RNView style={styles.streamFooter}>
                        {size && <RNView style={[styles.sizeBadge, { backgroundColor: colors.primarySurface }]}><Text style={[styles.streamSize, { color: colors.textMuted }]}>{size}</Text></RNView>}
                        <Text style={[styles.streamType, { color: colors.textDim }]}>{streamType}</Text>
                    </RNView>
                </Card>
            </Pressable>
        );
    });

    const renderLoadingState = (message: string) => (
        <RNView style={styles.loadingContainer}>
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" style={styles.activityIndicator} color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textDim }]}>{message}</Text>
            </View>
        </RNView>
    );

    const renderEmptyState = (icon: string, message: string) => (
        <RNView style={styles.emptyContainer}>
            <View style={styles.emptyContent}>
                <RNView style={[styles.emptyIconContainer, { backgroundColor: colors.primarySurface }]}>
                    <Feather name={icon as any} color={colors.primary} size={40} />
                </RNView>
                <Text style={[styles.emptyText, { color: colors.textDim }]}>{message}</Text>
            </View>
        </RNView>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            {loading && addons.length === 0 ? renderLoadingState('Loading addons...') : addons.length > 0 ? (
                <View style={[styles.addonSection, { borderColor: colors.primaryBorder }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addonListContainer}>
                        {addons.map((item, index) => <AddonItem key={`${item.name}-${index}`} item={item} />)}
                    </ScrollView>
                </View>
            ) : renderEmptyState('alert-circle', 'No addons configured. Please add addons in settings.')}
            {loading && addons.length > 0 ? renderLoadingState('Loading streams...') : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.streamsContainer}>
                        {streams.length > 0 ? streams.map((item, index) => <StreamItem key={`${item.name}-${index}`} item={item} index={index} />) : addons.length > 0 && renderEmptyState('video-off', 'No streams available')}
                    </View>
                </ScrollView>
            )}
            <BottomSpacing space={30} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, marginTop: 40 },
    scrollContainer: { paddingBottom: 20, maxWidth: 700, margin: 'auto', width: '100%' },
    addonSection: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16 },
    addonListContainer: { paddingHorizontal: 16, gap: 10 },
    addonItem: { borderRadius: 20, paddingVertical: 10, paddingHorizontal: 18, borderWidth: StyleSheet.hairlineWidth },
    addonItemPressed: { opacity: 0.7 },
    addonName: { fontSize: 14, fontWeight: '500', letterSpacing: -0.2 },
    streamsContainer: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
    streamContainer: { borderRadius: 14 },
    streamContainerPressed: { opacity: 0.7 },
    streamItem: { borderRadius: 14, padding: 16, borderWidth: StyleSheet.hairlineWidth },
    streamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
    streamName: { fontSize: 16, fontWeight: '500', flex: 1, lineHeight: 22, letterSpacing: -0.3 },
    qualityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
    qualityText: { fontSize: 12, fontWeight: '500', letterSpacing: 0.2 },
    streamDescription: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
    streamFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sizeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    streamSize: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
    streamType: { fontSize: 11, textTransform: 'uppercase', fontWeight: '500', letterSpacing: 0.8 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    activityIndicator: { marginBottom: 10 },
    loadingText: { fontSize: 14, marginTop: 10, fontWeight: '500' },
    centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContent: { alignItems: 'center', paddingHorizontal: 40 },
    emptyIconContainer: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

export default StreamListScreen;