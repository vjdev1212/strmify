import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Switch,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Playlist {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  createdAt: string;
}

interface FormData {
  name: string;
  url: string;
}

interface PlaylistItemProps {
  playlist: Playlist;
  index: number;
}

const PlaylistManagerScreen: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([
    {
      id: '1',
      name: 'Sports Channels',
      url: 'https://example.com/sports.m3u8',
      enabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'News Channels',
      url: 'https://example.com/news.m3u8',
      enabled: false,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', url: '' });

  const openModal = (playlist: Playlist | null = null): void => {
    if (playlist) {
      setEditingPlaylist(playlist);
      setFormData({ name: playlist.name, url: playlist.url });
    } else {
      setEditingPlaylist(null);
      setFormData({ name: '', url: '' });
    }
    setModalVisible(true);
  };

  const closeModal = (): void => {
    setModalVisible(false);
    setEditingPlaylist(null);
    setFormData({ name: '', url: '' });
  };

  const validateUrl = (url: string): boolean => {
    return url.includes('.m3u8') || url.includes('.m3u');
  };

  const savePlaylist = (): void => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    if (!formData.url.trim()) {
      Alert.alert('Error', 'Please enter a playlist URL');
      return;
    }

    if (!validateUrl(formData.url)) {
      Alert.alert('Error', 'Please enter a valid M3U8 playlist URL');
      return;
    }

    if (editingPlaylist) {
      // Update existing playlist
      setPlaylists(prev =>
        prev.map(p =>
          p.id === editingPlaylist.id
            ? { ...p, name: formData.name, url: formData.url }
            : p
        )
      );
    } else {
      // Add new playlist
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name: formData.name,
        url: formData.url,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      setPlaylists(prev => [...prev, newPlaylist]);
    }

    closeModal();
  };

  const deletePlaylist = (id: string): void => {
    Alert.alert(
      'Delete Playlist',
      'Are you sure you want to delete this playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setPlaylists(prev => prev.filter(p => p.id !== id)),
        },
      ]
    );
  };

  const togglePlaylist = (id: string): void => {
    setPlaylists(prev =>
      prev.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const reorderPlaylists = (fromIndex: number, toIndex: number): void => {
    const newPlaylists = [...playlists];
    const [removed] = newPlaylists.splice(fromIndex, 1);
    newPlaylists.splice(toIndex, 0, removed);
    setPlaylists(newPlaylists);
  };

  const PlaylistItem: React.FC<PlaylistItemProps> = ({ playlist, index }) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationY: translateY } }],
      { useNativeDriver: true }
    );

    const onHandlerStateChange = (event: any): void => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    };

    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.playlistItem,
            {
              opacity: playlist.enabled ? 1 : 0.5,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.dragHandle}>
            <Ionicons name="reorder-two" size={20} color="#666" />
          </View>

          <View style={styles.playlistContent}>
            <View style={styles.playlistHeader}>
              <Text style={styles.playlistName}>{playlist.name}</Text>
              <Switch
                value={playlist.enabled}
                onValueChange={() => togglePlaylist(playlist.id)}
                trackColor={{ false: '#333', true: '#535aff40' }}
                thumbColor={playlist.enabled ? '#535aff' : '#666'}
                ios_backgroundColor="#333"
              />
            </View>
            
            <Text style={styles.playlistUrl} numberOfLines={1}>
              {playlist.url}
            </Text>
            
            <View style={styles.playlistActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => openModal(playlist)}
              >
                <Ionicons name="pencil" size={16} color="#535aff" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => deletePlaylist(playlist.id)}
              >
                <Ionicons name="trash" size={16} color="#ff4757" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </PanGestureHandler>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>IPTV Playlists</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
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
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPlaylist ? 'Edit Playlist' : 'Add Playlist'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Playlist Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text: string) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Enter playlist name"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>M3U8 URL</Text>
              <TextInput
                style={[styles.input, styles.urlInput]}
                value={formData.url}
                onChangeText={(text: string) => setFormData(prev => ({ ...prev, url: text }))}
                placeholder="https://example.com/playlist.m3u8"
                placeholderTextColor="#666"
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={savePlaylist}
              >
                <Text style={styles.saveButtonText}>
                  {editingPlaylist ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 30,
    width: '100%',
    maxWidth: 780,
    margin: 'auto'
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
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  dragHandle: {
    marginRight: 12,
    paddingVertical: 8,
  },
  playlistContent: {
    flex: 1,
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  playlistUrl: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  playlistActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  editButton: {
    backgroundColor: '#535aff20',
  },
  editButtonText: {
    color: '#535aff',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ff475720',
  },
  deleteButtonText: {
    color: '#ff4757',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  formGroup: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  urlInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#535aff',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PlaylistManagerScreen;