import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    StyleSheet,
    Pressable,
    View as RNView,
    ScrollView,
    Modal,
    FlatList,
    Animated,
    Dimensions,
} from 'react-native';
import { ActivityIndicator, Card, StatusBar, Text, View } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { showAlert } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import BottomSpacing from '@/components/BottomSpacing';
import { extractQuality, extractSize, getStreamType } from '@/utils/StreamItem';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { useTheme } from '@/context/ThemeContext';
import { StreamingServerClient, TorrentFile } from '@/clients/stremio';

interface Stream {
    name: string;
    title?: string;
    url?: string;
    embed?: string;
    infoHash?: string;
    magnet?: string;
    magnetLink?: string;
    description?: string;
    fileIdx?: number;
}

interface Addon { name: string; url?: string; streamBaseUrl?: string; types?: string[]; }
interface StreamResponse { streams?: Stream[]; }

const ADDONS_KEY = StorageKeys.ADDONS_KEY;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInfoHashFromStream(stream: Stream): string | null {
    if (stream.infoHash) return stream.infoHash;
    const magnet = stream.magnet || stream.magnetLink;
    if (magnet) {
        const match = magnet.match(/xt=urn:btih:([a-fA-F0-9]{40}|[a-fA-F0-9]{32})/i);
        return match?.[1] ?? null;
    }
    return null;
}

function isTorrentStream(stream: Stream): boolean {
    return !stream.url && !!getInfoHashFromStream(stream);
}

// ─── File Selection Modal ─────────────────────────────────────────────────────

interface FileSelectionModalProps {
    visible: boolean;
    stream: Stream | null;
    files: TorrentFile[];
    loading: boolean;
    onSelectFile: (stream: Stream, fileIdx: number) => void;
    onClose: () => void;
    colors: any;
}

const FileSelectionModal: React.FC<FileSelectionModalProps> = ({
    visible,
    stream,
    files,
    loading,
    onSelectFile,
    onClose,
    colors,
}) => {
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 20,
                    stiffness: 200,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const formatSize = (bytes: number): string => {
        if (!bytes) return '';
        if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
        if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
        return `${(bytes / 1e3).toFixed(0)} KB`;
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <RNView style={modalStyles.root}>
                {/* Backdrop */}
                <Animated.View style={[modalStyles.backdrop, { opacity: backdropAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                </Animated.View>

                {/* Sheet */}
                <Animated.View
                    style={[
                        modalStyles.sheet,
                        {
                            backgroundColor: colors.primaryCard ?? '#1e1e1e',
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Handle */}
                    <RNView style={modalStyles.handleContainer}>
                        <RNView style={[modalStyles.handle, { backgroundColor: colors.primaryBorder ?? '#333' }]} />
                    </RNView>

                    {/* Header */}
                    <RNView style={modalStyles.header}>
                        <RNView style={modalStyles.headerLeft}>
                            <RNView style={[modalStyles.headerIcon, { backgroundColor: '#535aff22' }]}>
                                <Feather name="folder" size={18} color="#535aff" />
                            </RNView>
                            <RNView style={modalStyles.headerTextWrap}>
                                <Text style={modalStyles.headerTitle}>Select File</Text>
                                <Text
                                    style={[modalStyles.headerSubtitle, { color: colors.textMuted }]}
                                    numberOfLines={1}
                                >
                                    {stream?.name ?? 'Torrent'}
                                </Text>
                            </RNView>
                        </RNView>
                        <Pressable
                            style={({ pressed }) => [
                                modalStyles.closeBtn,
                                { backgroundColor: colors.primarySurface, opacity: pressed ? 0.6 : 1 },
                            ]}
                            onPress={onClose}
                        >
                            <Feather name="x" size={16} color={colors.textMuted} />
                        </Pressable>
                    </RNView>

                    {/* Divider */}
                    <RNView style={[modalStyles.divider, { backgroundColor: colors.primaryBorder }]} />

                    {/* Content */}
                    {loading ? (
                        <RNView style={modalStyles.centered}>
                            <ActivityIndicator size="large" color="#535aff" />
                            <Text style={[modalStyles.centeredText, { color: colors.textMuted }]}>
                                Fetching files…
                            </Text>
                        </RNView>
                    ) : files.length === 0 ? (
                        <RNView style={modalStyles.centered}>
                            <Feather name="alert-circle" size={28} color={colors.textDim} />
                            <Text style={[modalStyles.centeredText, { color: colors.textMuted }]}>
                                No files found in this torrent
                            </Text>
                        </RNView>
                    ) : (
                        <FlatList
                            data={files}
                            keyExtractor={(item, index) => `file-${item.id}-${index}`}
                            contentContainerStyle={modalStyles.fileList}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() => stream && onSelectFile(stream, item.id)}
                                    style={({ pressed }) => [
                                        modalStyles.fileItem,
                                        {
                                            backgroundColor: pressed
                                                ? colors.primarySurface
                                                : colors.primarySurface + '80',
                                            borderColor: colors.primaryBorder,
                                        },
                                    ]}
                                >
                                    <RNView style={modalStyles.fileInfo}>
                                        <Text
                                            style={[modalStyles.fileName, { color: colors.text }]}
                                            numberOfLines={2}
                                        >
                                            {item.name}
                                        </Text>
                                        {item.length > 0 && (
                                            <Text style={[modalStyles.fileSize, { color: colors.textMuted }]}>
                                                {formatSize(item.length)}
                                            </Text>
                                        )}
                                    </RNView>
                                    <Feather name="chevron-right" size={16} color={colors.textDim} />
                                </Pressable>
                            )}
                        />
                    )}
                </Animated.View>
            </RNView>
        </Modal>
    );
};

const modalStyles = StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,1)' },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: SCREEN_HEIGHT * 0.75,
        paddingBottom: 40,
    },
    handleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
    handle: { width: 36, height: 4, borderRadius: 2 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    headerIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    headerTextWrap: { flex: 1 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', letterSpacing: -0.3 },
    headerSubtitle: { fontSize: 12, marginTop: 2 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 20, marginBottom: 4 },
    centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
    centeredText: { fontSize: 14, fontWeight: '500' },
    fileList: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 14,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 8,
        gap: 12,
    },
    fileInfo: { flex: 1, gap: 4 },
    fileName: { fontSize: 14, fontWeight: '500', letterSpacing: -0.2, lineHeight: 20 },
    fileSize: { fontSize: 12, fontWeight: '500' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const StreamListScreen = () => {
    const { colors } = useTheme();
    const { imdbid, type, name, title, season, episode } = useLocalSearchParams<{
        imdbid: string; type: string; name: string; title: string; season?: string; episode?: string;
    }>();

    const [addons, setAddons] = useState<Addon[]>([]);
    const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // ── File selection state ──
    const [fileModalVisible, setFileModalVisible] = useState(false);
    const [pendingStream, setPendingStream] = useState<Stream | null>(null);
    const [pendingStreamIndex, setPendingStreamIndex] = useState<number>(0);
    const [torrentFiles, setTorrentFiles] = useState<TorrentFile[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);
    const currentAddonRef = useRef<string>('');
    const router = useRouter();

    // ── Stremio client ────────────────────────────────────────────────────────

    const getStremioClient = useCallback((): StreamingServerClient | null => {
        try {
            const stored = storageService.getItem(StorageKeys.SERVERS_KEY);
            if (!stored) return null;
            const allServers = JSON.parse(stored);
            const stremioServers = allServers.filter((s: any) => s.serverType === 'stremio');
            if (stremioServers.length === 0) return null;
            const current = stremioServers.find((s: any) => s.current) ?? stremioServers[0];
            return new StreamingServerClient(current.serverUrl);
        } catch {
            return null;
        }
    }, []);

    // ── Addon / stream fetching (unchanged) ───────────────────────────────────

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
            if (currentAddonRef.current === requestAddonName && !controller.signal.aborted) {
                setStreams(data.streams || []); setLoading(false);
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                if (currentAddonRef.current === requestAddonName) { setStreams([]); setLoading(false); }
            }
        }
    }, [imdbid, type, season, episode]);

    useEffect(() => { fetchAddons(); }, [fetchAddons]);
    useEffect(() => () => { if (abortControllerRef.current) abortControllerRef.current.abort(); }, []);

    const handleAddonPress = useCallback(async (item: Addon): Promise<void> => {
        currentAddonRef.current = item.name; setSelectedAddon(item); await fetchStreams(item);
    }, [fetchStreams]);

    // ── Navigation helper ─────────────────────────────────────────────────────

    const navigateToPlayer = useCallback((streamList: Stream[], streamIndex: number) => {
        router.push({
            pathname: '/stream/player',
            params: {
                streams: JSON.stringify(streamList),
                selectedStreamIndex: streamIndex.toString(),
                title, imdbid, type, season, episode,
            },
        });
    }, [router, title, imdbid, type, season, episode]);

    // ── Stream tap handler ────────────────────────────────────────────────────

    const handleStreamSelected = useCallback(async (stream: Stream, index: number): Promise<void> => {
        if (!isTorrentStream(stream)) {
            navigateToPlayer(streams, index);
            return;
        }

        const infoHash = getInfoHashFromStream(stream);
        const client = getStremioClient();

        if (!client || !infoHash) {
            // No server configured — let the player handle it
            navigateToPlayer(streams, index);
            return;
        }

        // Show modal and fetch file list
        setPendingStream(stream);
        setPendingStreamIndex(index);
        setTorrentFiles([]);
        setFilesLoading(true);
        setFileModalVisible(true);

        try {
            const files = await client.getTorrentFiles(infoHash);

            // Only one file — skip the picker and play directly
            if (files.length <= 1) {
                setFileModalVisible(false);
                setPendingStream(null);
                const updated = [...streams];
                updated[index] = { ...stream, fileIdx: files[0]?.id ?? 0 };
                navigateToPlayer(updated, index);
                return;
            }

            setTorrentFiles(files);
        } catch {
            // On error fall through to player without file selection
            setFileModalVisible(false);
            setPendingStream(null);
            navigateToPlayer(streams, index);
        } finally {
            setFilesLoading(false);
        }
    }, [streams, getStremioClient, navigateToPlayer]);

    const handleFileSelected = useCallback((stream: Stream, fileIdx: number) => {
        setFileModalVisible(false);
        setTorrentFiles([]);
        const updated = [...streams];
        updated[pendingStreamIndex] = { ...stream, fileIdx };
        setPendingStream(null);
        navigateToPlayer(updated, pendingStreamIndex);
    }, [streams, pendingStreamIndex, navigateToPlayer]);

    // ── Sub-components (unchanged from original) ──────────────────────────────

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
                        {streams.length > 0
                            ? streams.map((item, index) => <StreamItem key={`${item.name}-${index}`} item={item} index={index} />)
                            : addons.length > 0 && renderEmptyState('video-off', 'No streams available')
                        }
                    </View>
                </ScrollView>
            )}

            <BottomSpacing space={30} />

            <FileSelectionModal
                visible={fileModalVisible}
                stream={pendingStream}
                files={torrentFiles}
                loading={filesLoading}
                onSelectFile={handleFileSelected}
                onClose={() => { setFileModalVisible(false); setPendingStream(null); setTorrentFiles([]); }}
                colors={colors}
            />
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