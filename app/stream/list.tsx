import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View as RNView, useWindowDimensions } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { Share } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MenuView } from '@expo/ui/community/menu';
import * as Clipboard from 'expo-clipboard';
import { NativeButton } from '@/components/native-ui-controls';
import { ActivityIndicator, StatusBar, Text, View } from '@/components/Themed';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { extractQuality, extractSize, getStreamType } from '@/utils/StreamItem';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { useTheme } from '@/context/ThemeContext';
import { radius, spacing, systemDarkBackground, typography } from '@/constants/theme';

interface Stream { name: string; title?: string; url?: string; embed?: string; infoHash?: string; magnet?: string; magnetLink?: string; description?: string; }
interface Addon { name: string; url?: string; streamBaseUrl?: string; types?: string[]; }
interface StreamResponse { streams?: Stream[]; }
type ThemeColors = ReturnType<typeof useTheme>['colors'];

const ADDONS_KEY = StorageKeys.ADDONS_KEY;

const triggerActionHaptic = () => {
    if (!isHapticsSupported()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error: unknown) => {
        console.warn('Unable to trigger stream action haptic:', error);
    });
};

const getStreamHash = (stream: Stream): string | undefined => {
    const candidates = [stream.infoHash, stream.magnet, stream.magnetLink, stream.url];
    for (const candidate of candidates) {
        if (!candidate) continue;
        const directHash = candidate.trim();
        const magnetHash = directHash.match(/xt=urn:btih:([a-f\d]{40}|[a-z\d]{32})/i)?.[1];
        if (magnetHash) return magnetHash;
        if (/^[a-f\d]{40}$/i.test(directHash) || /^[a-z\d]{32}$/i.test(directHash)) return directHash;
    }
    return undefined;
};

const getStreamUrl = (stream: Stream): string | undefined => stream.url || stream.embed;

const AddonItem = React.memo(({
    item,
    isSelected,
    onPress,
}: {
    item: Addon;
    isSelected: boolean;
    onPress: (item: Addon) => void;
}) => (
    <Pressable
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        style={[styles.addonItem, isSelected && styles.selectedAddonItem]}
    >
        <Text style={[
            styles.addonName,
            { color: isSelected ? '#FFFFFF' : '#D0D0D0', fontWeight: isSelected ? '600' : '400' },
        ]} numberOfLines={1}>
            {item.name}
        </Text>
    </Pressable>
));

const StreamItem = React.memo(({
    item,
    index,
    colors,
    cardWidth,
    isLast,
    onOpen,
    onCopy,
    onShare,
}: {
    item: Stream;
    index: number;
    colors: ThemeColors;
    cardWidth: number;
    isLast: boolean;
    onOpen: () => void;
    onCopy: (stream: Stream) => void;
    onShare: (stream: Stream) => void;
}) => {
    const { name, title, description } = item;
    const quality = extractQuality(name, title);
    const size = extractSize(description || title || '');
    const streamType = getStreamType(item);
    const streamTypeIcon = streamType === 'Embed'
        ? 'code'
        : streamType === 'Direct'
            ? 'link'
            : 'help-circle';
    const hash = getStreamHash(item);
    const url = getStreamUrl(item);
    const isUrlOnly = Boolean(url && !hash && !item.magnet && !item.magnetLink);
    const actions = [
        { id: 'open', title: 'Open', image: 'play.fill' as const },
        ...(hash || url ? [{ id: 'copy', title: hash ? 'Copy Hash' : 'Copy Url', image: 'doc.on.doc' as const }] : []),
        ...(isUrlOnly ? [{ id: 'share', title: 'Share', image: 'square.and.arrow.up' as const }] : []),
    ];
    return (
        <RNView
            style={[
                styles.streamItemContainer,
                { width: cardWidth },
            ]}
        >
            <Pressable
                onPress={onOpen}
                accessibilityRole="button"
                accessibilityLabel={`Open ${name}`}
                style={styles.streamItem}
            >
                <RNView style={styles.streamHeader}>
                    <RNView style={styles.streamTitleLabel}>
                        <Feather name="film" size={15} color={colors.textMuted} style={styles.streamTitleIcon} />
                        <Text style={[styles.streamName, { color: colors.text }]} numberOfLines={2}>{name}</Text>
                    </RNView>
                    {quality ? (
                        <RNView style={[styles.qualityBadge, { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder }]}>
                            <Feather name="tv" size={13} color={colors.text} />
                            <Text style={[styles.qualityText, { color: colors.text }]}>{quality}</Text>
                        </RNView>
                    ) : null}
                </RNView>
                {(title || description) ? (
                    <Text style={[styles.streamDescription, { color: colors.textMuted }]}>{title || description}</Text>
                ) : null}
                <RNView style={styles.streamFooter}>
                    {size ? (
                        <RNView style={styles.sizeBadge}>
                            <Feather name="hard-drive" size={12} color={colors.textMuted} />
                            <Text style={[styles.streamSize, { color: colors.textMuted }]}>{size}</Text>
                        </RNView>
                    ) : null}
                    <RNView style={styles.streamTypeLabel}>
                        {streamType === 'Torrent' ? (
                            <Ionicons name="magnet-outline" size={13} color={colors.textDim} />
                        ) : (
                            <Feather name={streamTypeIcon} size={13} color={colors.textDim} />
                        )}
                        <Text style={[styles.streamType, { color: colors.textDim }]}>{streamType}</Text>
                    </RNView>
                </RNView>
            </Pressable>
            <MenuView
                title="Stream Actions"
                actions={actions}
                onPressAction={({ nativeEvent }) => {
                    if (nativeEvent.event === 'open') onOpen();
                    if (nativeEvent.event === 'copy') onCopy(item);
                    if (nativeEvent.event === 'share') onShare(item);
                }}
                style={styles.actionMenu}
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Stream actions"
                    hitSlop={8}
                    style={styles.actionButton}
                    onPressIn={triggerActionHaptic}
                    onPress={(event) => event.stopPropagation()}
                >
                    <Feather name="more-vertical" size={20} color={colors.textMuted} />
                </Pressable>
            </MenuView>
            {!isLast ? <RNView style={[styles.streamDivider, { backgroundColor: colors.border }]} /> : null}
        </RNView>
    );
});

const StreamListScreen = () => {
    const { colors } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const [pagerWidth, setPagerWidth] = useState(screenWidth);
    const { imdbid, type, title, season, episode } = useLocalSearchParams<{ imdbid: string; type: string; name: string; title: string; season?: string; episode?: string; }>();
    const [addons, setAddons] = useState<Addon[]>([]);
    const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
    const [selectedAddonIndex, setSelectedAddonIndex] = useState(0);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const currentAddonRef = useRef<string>('');
    const selectedAddonIndexRef = useRef(0);
    const streamsPagerRef = useRef<ScrollViewInstance>(null);
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
                selectedAddonIndexRef.current = 0;
                setSelectedAddonIndex(0);
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

    const selectAddon = useCallback((index: number) => {
        const addon = addons[index];
        if (!addon || selectedAddonIndexRef.current === index) return;
        triggerActionHaptic();
        selectedAddonIndexRef.current = index;
        setSelectedAddonIndex(index);
        setSelectedAddon(addon);
        currentAddonRef.current = addon.name;
        void fetchStreams(addon);
    }, [addons, fetchStreams]);

    const handleAddonPress = useCallback((item: Addon) => {
        const index = addons.findIndex((addon) => addon.name === item.name);
        if (index < 0) return;
        selectAddon(index);
        streamsPagerRef.current?.scrollTo({ x: index * pagerWidth, animated: true });
    }, [addons, pagerWidth, selectAddon]);

    const handleStreamsPagerEnd = useCallback((offsetX: number) => {
        const index = Math.min(
            addons.length - 1,
            Math.max(0, Math.round(offsetX / pagerWidth)),
        );
        selectAddon(index);
    }, [addons.length, pagerWidth, selectAddon]);

    const handleStreamSelected = useCallback(async (stream: Stream, index: number): Promise<void> => {
        triggerActionHaptic();
        router.push({ pathname: '/stream/player', params: { streams: JSON.stringify(streams), selectedStreamIndex: index.toString(), title, imdbid, type, season, episode } });
    }, [streams, router, imdbid, type, season, episode]);

    const handleCopyStreamValue = useCallback(async (stream: Stream): Promise<void> => {
        triggerActionHaptic();
        const hash = getStreamHash(stream);
        const value = hash || getStreamUrl(stream);
        if (!value) {
            showAlert('Copy', 'This stream does not have a hash or URL to copy.');
            return;
        }
        try {
            await Clipboard.setStringAsync(value);
            showAlert('Copied', hash ? 'Stream hash copied.' : 'Stream URL copied.');
        } catch (error) {
            console.error('Failed to copy stream value:', error);
            showAlert('Copy', 'Unable to copy the stream value.');
        }
    }, []);

    const handleShareStreamUrl = useCallback(async (stream: Stream): Promise<void> => {
        triggerActionHaptic();
        const url = getStreamUrl(stream);
        if (!url || getStreamHash(stream) || stream.magnet || stream.magnetLink) {
            showAlert('Share', 'This stream does not have a shareable URL.');
            return;
        }
        try {
            await Share.share({ message: url, url });
        } catch (error) {
            console.error('Failed to share stream URL:', error);
            showAlert('Share', 'Unable to share the stream URL.');
        }
    }, []);

    const renderLoadingState = (message: string) => (
        <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textDim, fontSize: 14 }}>{message}</Text>
        </View>
    );

    const renderEmptyState = (message: string, icon?: React.ComponentProps<typeof Feather>['name']) => (
        <View style={styles.stateContainer}>
            {icon ? <Feather name={icon} size={36} color={colors.textDim} /> : null}
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
                {message}
            </Text>
        </View>
    );

    const renderNoAddonsState = () => (
        <View style={styles.noAddonsStateContainer}>
            <RNView style={styles.noAddonsMessage}>
                <RNView style={[styles.emptyStateIcon, { backgroundColor: colors.primarySurface }]}>
                    <Feather name="box" size={36} color={colors.primary} />
                </RNView>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 22, textAlign: 'center' }}>
                    No add-ons configured
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 18, textAlign: 'center' }}>
                    Add an add-on to browse streams.
                </Text>
                <NativeButton
                    variant="filled"
                    onPress={() => {
                        triggerActionHaptic();
                        router.push('/settings/add');
                    }}
                    seedColor="#ffffff"
                    style={styles.addAddonButton}
                >
                    <Ionicons name="add-outline" size={24} color="#000000" style={styles.addAddonButtonIcon} />
                    <Text style={styles.addAddonButtonText}>Add an add-on</Text>
                </NativeButton>
            </RNView>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <StatusBar />
            <Stack.Screen options={{
                title,
                headerTitle: title,
                headerTitleAlign: 'center',
                headerTransparent: false,
                headerBackground: () => (
                    <RNView style={{ flex: 1, backgroundColor: systemDarkBackground }} />
                ),
                headerShadowVisible: false,
            }} />
            {loading && addons.length === 0 ? renderLoadingState('Loading add-ons…') : addons.length > 0 ? (
                <>
                    <View style={styles.sourceSection}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.addonList}
                        >
                            {addons.map((item, index) => (
                                <AddonItem
                                    key={`${item.name}-${index}`}
                                    item={item}
                                    isSelected={item.name === selectedAddon?.name}
                                    onPress={handleAddonPress}
                                />
                            ))}
                        </ScrollView>
                    </View>
                    <ScrollView
                        ref={streamsPagerRef}
                        horizontal
                        pagingEnabled
                        nestedScrollEnabled
                        directionalLockEnabled
                        showsHorizontalScrollIndicator={false}
                        onLayout={(event) => setPagerWidth(event.nativeEvent.layout.width)}
                        onMomentumScrollEnd={(event) => handleStreamsPagerEnd(event.nativeEvent.contentOffset.x)}
                        style={styles.streamsPager}
                        contentContainerStyle={styles.streamsPagerContent}
                    >
                        {addons.map((addon, index) => (
                            <View key={`${addon.name}-${index}`} style={[styles.streamsPage, { width: pagerWidth }]}>
                                {index === selectedAddonIndex ? (
                                    loading ? renderLoadingState('Loading streams…') : streams.length > 0 ? (
                                        <ScrollView
                                            nestedScrollEnabled
                                            showsVerticalScrollIndicator={false}
                                            style={styles.scrollContainer}
                                            contentContainerStyle={styles.streamsContent}
                                        >
                                            {streams.map((item, streamIndex) => (
                                                <StreamItem
                                                    key={`${item.name}-${streamIndex}`}
                                                    item={item}
                                                    index={streamIndex}
                                                    colors={colors}
                                                    cardWidth={pagerWidth}
                                                    isLast={streamIndex === streams.length - 1}
                                                    onOpen={() => void handleStreamSelected(item, streamIndex)}
                                                    onCopy={handleCopyStreamValue}
                                                    onShare={handleShareStreamUrl}
                                                />
                                            ))}
                                        </ScrollView>
                                    ) : renderEmptyState('No streams available from this add-on.', 'inbox')
                                ) : null}
                            </View>
                        ))}
                    </ScrollView>
                </>
            ) : renderNoAddonsState()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    sourceSection: { width: '100%', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
    addonList: { alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.md },
    addonItem: { minHeight: 44, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    selectedAddonItem: { borderBottomColor: '#0A84FF' },
    addonName: { ...typography.subhead, fontWeight: '600' },
    streamsPager: { flex: 1 },
    streamsPagerContent: { flexGrow: 1 },
    streamsPage: { flex: 1 },
    scrollContainer: { flex: 1, alignSelf: 'stretch', width: '100%' },
    streamsContent: { paddingTop: 8, paddingBottom: 64 },
    streamItemContainer: { position: 'relative', paddingLeft: spacing.lg, paddingRight: spacing.md, paddingVertical: spacing.sm },
    streamItem: { width: '100%', paddingRight: spacing.xl },
    streamHeader: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start', marginBottom: spacing.sm, gap: spacing.sm },
    actionMenu: { position: 'absolute', top: spacing.xs, right: spacing.md, zIndex: 1 },
    actionButton: { minWidth: 32, minHeight: 32, justifyContent: 'center', alignItems: 'center' },
    streamTitleLabel: { flexShrink: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
    streamTitleIcon: { marginTop: 3 },
    streamName: { ...typography.headline, flexShrink: 1 },
    qualityBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth },
    qualityText: { ...typography.caption, fontWeight: '600' },
    streamDescription: { ...typography.caption, marginBottom: spacing.md },
    streamFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    streamTypeLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    sizeBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm },
    streamSize: { ...typography.caption, fontWeight: '500' },
    streamType: { ...typography.caption, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.8 },
    streamDivider: { height: StyleSheet.hairlineWidth, width: '100%', marginVertical: spacing.sm },
    stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
    noAddonsStateContainer: {
        flex: 1,
        width: '100%',
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noAddonsMessage: {
        alignItems: 'center',
        gap: 8,
    },
    emptyStateIcon: {
        width: 72,
        height: 72,
        borderRadius: radius.capsule,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: -4,
    },
    addAddonButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.capsule,
        minWidth: 150,
        alignItems: 'center',
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        marginTop: 12,
    },
    addAddonButtonText: { color: '#000000', ...typography.headline },
    addAddonButtonIcon: { marginRight: 8 },
});

export default StreamListScreen;
