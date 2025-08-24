import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ScrollView,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { confirmAction } from '@/utils/CrossPlatform';

interface Playlist {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    createdAt: string;
}

interface PlaylistItemProps {
    playlist: Playlist;
    index: number;
    isEditing: boolean;
    isExpanded: boolean;
    onEdit: (id: string) => void;
    onSave: (id: string, name: string, url: string) => void;
    onCancel: () => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
    onExpand: (id: string) => void;
}

const STORAGE_KEY = '@iptv_playlists';

const PlaylistManagerScreen: React.FC = () => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

    // Load playlists from storage on component mount
    useEffect(() => {
        loadPlaylists();
    }, []);

    // Save playlists to storage whenever playlists change
    useEffect(() => {
        if (!isLoading) { // Don't save during initial load
            savePlaylists();
        }
    }, [playlists, isLoading]);

    const loadPlaylists = async (): Promise<void> => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsedPlaylists = JSON.parse(stored);
                setPlaylists(parsedPlaylists);
                console.log('Loaded playlists:', parsedPlaylists.length);
            }
        } catch (error) {
            console.error('Error loading playlists:', error);
            Alert.alert('Error', 'Failed to load saved playlists');
        } finally {
            setIsLoading(false);
        }
    };

    const savePlaylists = async (): Promise<void> => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
            console.log('Saved playlists:', playlists.length);
        } catch (error) {
            console.error('Error saving playlists:', error);
        }
    };

    const validateUrl = (url: string): boolean => {
        return url.includes('.m3u8') || url.includes('.m3u');
    };

    const addNewPlaylist = async (): Promise<void> => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newPlaylist: Playlist = {
            id: Date.now().toString(),
            name: '',
            url: '',
            enabled: true,
            createdAt: new Date().toISOString(),
        };
        setPlaylists(prev => [newPlaylist, ...prev]);
        setEditingId(newPlaylist.id);
        setExpandedId(newPlaylist.id);
        setIsAddingNew(true);
    };

    const savePlaylist = async (id: string, name: string, url: string): Promise<void> => {
        if (!name.trim()) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Please enter a playlist name');
            return;
        }

        if (!url.trim()) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Please enter a playlist URL');
            return;
        }

        if (!validateUrl(url)) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Please enter a valid M3U8 playlist URL');
            return;
        }

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPlaylists(prev =>
            prev.map(p =>
                p.id === id ? { ...p, name: name.trim(), url: url.trim() } : p
            )
        );

        setEditingId(null);
        setIsAddingNew(false);
        
        // Show success message
        Alert.alert('Success', 'Playlist saved successfully!');
    };

    const cancelEdit = async (): Promise<void> => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        if (isAddingNew) {
            // Remove the new playlist if it was being added
            setPlaylists(prev => prev.filter(p => p.id !== editingId));
            setIsAddingNew(false);
            setExpandedId(null);
        }
        setEditingId(null);
    };

    const deletePlaylist = async (id: string): Promise<void> => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const confirmed = await confirmAction(
            'Confirm Delete',
            'Are you sure you want to delete this playlist?',
            'Delete'
        );
        if (!confirmed) return;
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPlaylists(prev => prev.filter(p => p.id !== id));
        
        if (editingId === id) {
            setEditingId(null);
            setIsAddingNew(false);
        }
        if (expandedId === id) {
            setExpandedId(null);
        }
        
        Alert.alert('Success', 'Playlist deleted successfully');
    };

    const togglePlaylist = async (id: string): Promise<void> => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPlaylists(prev =>
            prev.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p))
        );
    };

    const startEditing = async (id: string): Promise<void> => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        if (editingId && editingId !== id) {
            cancelEdit();
        }
        setEditingId(id);
        setExpandedId(id);
        setIsAddingNew(false);
    };

    const toggleExpanded = async (id: string): Promise<void> => {
        if (editingId === id) return;
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        setExpandedId(expandedId === id ? null : id);
    };

    const PlaylistItem: React.FC<PlaylistItemProps> = ({
        playlist,
        index,
        isEditing,
        isExpanded,
        onEdit,
        onSave,
        onCancel,
        onDelete,
        onToggle,
        onExpand
    }) => {
        const [editName, setEditName] = useState<string>(playlist.name);
        const [editUrl, setEditUrl] = useState<string>(playlist.url);

        // Update local state when playlist prop changes
        useEffect(() => {
            setEditName(playlist.name);
            setEditUrl(playlist.url);
        }, [playlist.name, playlist.url]);

        const handleSave = (): void => {
            onSave(playlist.id, editName, editUrl);
        };

        const handleCancel = (): void => {
            setEditName(playlist.name);
            setEditUrl(playlist.url);
            onCancel();
        };

        if (isEditing) {
            return (
                <View style={[styles.playlistItem, styles.editingItem]}>
                    <View style={styles.editingContent}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Playlist Name</Text>
                            <TextInput
                                style={styles.editInput}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Enter playlist name"
                                placeholderTextColor="#666"
                                autoFocus={isAddingNew}
                                submitBehavior="blurAndSubmit"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>M3U8 URL</Text>
                            <TextInput
                                style={[styles.editInput, styles.urlEditInput]}
                                value={editUrl}
                                onChangeText={setEditUrl}
                                placeholder="https://example.com/playlist.m3u8"
                                placeholderTextColor="#666"
                                multiline
                                autoCapitalize="none"
                                autoCorrect={false}
                                submitBehavior="blurAndSubmit"
                            />
                        </View>

                        <View style={styles.editActions}>
                            <TouchableOpacity
                                style={[styles.editActionButton, styles.cancelEditButton]}
                                onPress={handleCancel}
                            >
                                <Ionicons name="close" size={16} color="#ff4757" />
                                <Text style={styles.cancelEditText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.editActionButton, styles.saveEditButton]}
                                onPress={handleSave}
                            >
                                <Ionicons name="checkmark" size={16} color="#fff" />
                                <Text style={styles.saveEditText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.playlistItem}>
                <TouchableOpacity
                    style={styles.playlistHeader}
                    onPress={() => onExpand(playlist.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.playlistMainInfo}>
                        <View style={styles.playlistTitleRow}>
                            <View style={styles.titleWithStatus}>
                                <Text style={[
                                    styles.playlistName,
                                    { opacity: playlist.enabled ? 1 : 0.6 }
                                ]}>
                                    {playlist.name || 'Untitled Playlist'}
                                </Text>
                                {!playlist.enabled && (
                                    <View style={styles.statusBadge}>
                                        <Text style={styles.badgeText}>
                                            Inactive
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <Text style={styles.playlistUrl} numberOfLines={1}>
                            {playlist.url || 'No URL'}
                        </Text>
                    </View>
                    <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#666"
                    />
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.playlistActions}>
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                playlist.enabled ? styles.disableButton : styles.enableButton
                            ]}
                            onPress={() => onToggle(playlist.id)}
                        >
                            <Ionicons
                                name={playlist.enabled ? "pause" : "play"}
                                size={16}
                                color={playlist.enabled ? "#ff9500" : "#00ff88"}
                            />
                            <Text style={[
                                styles.actionButtonText,
                                { color: playlist.enabled ? "#ff9500" : "#00ff88" }
                            ]}>
                                {playlist.enabled ? 'Disable' : 'Enable'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => onEdit(playlist.id)}
                        >
                            <Ionicons name="pencil" size={16} color="#535aff" />
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => onDelete(playlist.id)}
                        >
                            <Ionicons name="trash" size={16} color="#ff4757" />
                            <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Show loading state
    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>IPTV Playlists</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading playlists...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>IPTV Playlists</Text>
                <TouchableOpacity style={styles.addButton} onPress={addNewPlaylist}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {playlists.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="tv" size={64} color="#333" />
                        <Text style={styles.emptyTitle}>No Playlists</Text>
                        <Text style={styles.emptySubtitle}>
                            Add your first IPTV playlist to get started
                        </Text>
                    </View>
                ) : (
                    playlists.map((playlist, index) => (
                        <PlaylistItem
                            key={playlist.id}
                            playlist={playlist}
                            index={index}
                            isEditing={editingId === playlist.id}
                            isExpanded={expandedId === playlist.id}
                            onEdit={startEditing}
                            onSave={savePlaylist}
                            onCancel={cancelEdit}
                            onDelete={deletePlaylist}
                            onToggle={togglePlaylist}
                            onExpand={toggleExpanded}
                        />
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 30,
        width: '100%',
        maxWidth: 780,
        margin: 'auto',
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },
    addButton: {
        backgroundColor: '#535aff',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#535aff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    playlistItem: {
        backgroundColor: '#111',
        borderRadius: 12,
        marginVertical: 6,
        borderWidth: 1,
        borderColor: '#222',
        overflow: 'hidden',
    },
    editingItem: {
        backgroundColor: '#151515',
        borderColor: '#222',
        borderWidth: 1,
        padding: 16,
    },
    editingContent: {
        width: '100%',
    },
    playlistHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    playlistMainInfo: {
        flex: 1,
        marginRight: 12,
    },
    playlistTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    titleWithStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    playlistName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 8,
        backgroundColor: '#66666620',
        borderWidth: 1,
        borderColor: '#66666640',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: '#666',
    },
    playlistUrl: {
        fontSize: 12,
        color: '#888',
    },
    playlistActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    enableButton: {
        backgroundColor: '#00ff8820',
    },
    disableButton: {
        backgroundColor: '#ff950020',
    },
    editButton: {
        backgroundColor: '#535aff20',
    },
    editButtonText: {
        color: '#535aff',
        fontSize: 12,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#ff475720',
    },
    deleteButtonText: {
        color: '#ff4757',
        fontSize: 12,
        fontWeight: '600',
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    editInput: {
        backgroundColor: '#222',
        borderRadius: 8,
        padding: 12,
        color: '#fff',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#222',
    },
    urlEditInput: {
        minHeight: 60,
        textAlignVertical: 'top',
    },
    editActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    editActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    cancelEditButton: {
        backgroundColor: '#333',
    },
    cancelEditText: {
        color: '#ff4757',
        fontSize: 14,
        fontWeight: '600',
    },
    saveEditButton: {
        backgroundColor: '#535aff',
    },
    saveEditText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default PlaylistManagerScreen;