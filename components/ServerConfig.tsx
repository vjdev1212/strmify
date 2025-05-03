import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Switch, TextInput, Pressable, FlatList, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text } from '@/components/Themed';
import { showAlert } from '@/utils/platform';
import { useColorScheme } from './useColorScheme';
import { AntDesign, Feather, MaterialIcons } from '@expo/vector-icons';

interface ServerConfigProps {
  serverName: string;
  serverType: string;
  defaultUrl: string;
}

export interface ServerConfig {
  serverId: string;
  serverType: string;
  serverName: string;
  serverUrl: string;
  current: boolean;
}

const ServerConfiguration: React.FC<ServerConfigProps> = ({ serverName, serverType, defaultUrl }) => {
  const colorScheme = useColorScheme();
  const [serverUrl, setServerUrl] = useState<string>(defaultUrl);
  const [isCurrent, setIsCurrent] = useState<boolean>(false);
  const [serverConfigs, setServerConfigs] = useState<ServerConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');

  useEffect(() => {
    loadServers();
  }, [serverType]);

  const loadServers = async () => {
    try {
      const savedConfigs = await AsyncStorage.getItem('servers');
      const servers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];
      const filteredServers = servers.filter(server => server.serverType === serverType);

      setServerConfigs(filteredServers);

      // If no servers exist for this type, prepare to add the default one
      if (filteredServers.length === 0) {
        setServerUrl(defaultUrl);
        setIsCurrent(true); // Make the first server current by default
        setIsAddingNew(true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSave = async () => {
    if (!serverUrl.trim() || !isValidUrl(serverUrl)) {
      showAlert('Error', 'Please enter a valid server URL.');
      return;
    }

    try {
      const savedConfigs = await AsyncStorage.getItem('servers');
      const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];

      let updatedAllServers: ServerConfig[];
      let configToSave: ServerConfig;

      // If this server is being set as current, unset all others of this type
      const otherServersOfSameType = isCurrent ?
        allServers.map(server =>
          server.serverType === serverType ? { ...server, current: false } : server
        ) :
        allServers;

      if (editingId) {
        // Update existing server
        configToSave = {
          serverId: editingId,
          serverType,
          serverName,
          serverUrl: serverUrl.trim(),
          current: isCurrent,
        };

        updatedAllServers = otherServersOfSameType.map(server =>
          server.serverId === editingId ? configToSave : server
        );
      } else {
        // Add new server
        configToSave = {
          serverId: `${serverType}-${Date.now()}`,
          serverType,
          serverName,
          serverUrl: serverUrl.trim(),
          current: isCurrent,
        };

        updatedAllServers = [...otherServersOfSameType, configToSave];
      }

      await AsyncStorage.setItem('servers', JSON.stringify(updatedAllServers));

      // Reset the form and refresh the list
      setEditingId(null);
      setIsAddingNew(false);
      setServerUrl(defaultUrl);
      setIsCurrent(false);
      await loadServers();

      showAlert('Success', `${serverName} server configuration saved.`);
    } catch (error) {
      showAlert('Error', 'Failed to save configuration.');
      console.error('Error saving settings:', error);
    }
  };

  const handleAddNew = () => {
    setEditingId(null);
    setServerUrl(defaultUrl);
    setIsCurrent(serverConfigs.length === 0); // Auto-set as current if it's the first server
    setIsAddingNew(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setServerUrl(defaultUrl);
    setIsCurrent(false);
  };

  const toggleCurrent = useCallback(() => setIsCurrent(prev => !prev), []);

  // Inline editing functions
  const startInlineEdit = (server: ServerConfig) => {
    setInlineEditingId(server.serverId);
    setInlineEditValue(server.serverUrl);
    setSelectedServerId(null); // Close the action menu if open
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineEditValue('');
  };

  const saveInlineEdit = async () => {
    if (!inlineEditValue.trim() || !isValidUrl(inlineEditValue)) {
      showAlert('Error', 'Please enter a valid server URL.');
      return;
    }

    try {
      const savedConfigs = await AsyncStorage.getItem('servers');
      const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];

      const updatedAllServers = allServers.map(server =>
        server.serverId === inlineEditingId ? { ...server, serverUrl: inlineEditValue.trim() } : server
      );

      await AsyncStorage.setItem('servers', JSON.stringify(updatedAllServers));

      setInlineEditingId(null);
      setInlineEditValue('');
      await loadServers();

      showAlert('Success', 'Server URL updated successfully.');
    } catch (error) {
      showAlert('Error', 'Failed to update server URL.');
      console.error('Error updating server URL:', error);
    }
  };

  const handleDelete = async (serverId: string) => {
    try {
      const savedConfigs = await AsyncStorage.getItem('servers');
      const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];

      const serverToDelete = allServers.find(server => server.serverId === serverId);
      if (serverToDelete?.current) {
        showAlert('Error', 'Cannot delete the current server. Please set another server as current first.');
        return;
      }

      const updatedAllServers = allServers.filter(server => server.serverId !== serverId);
      await AsyncStorage.setItem('servers', JSON.stringify(updatedAllServers));

      setSelectedServerId(null);
      await loadServers();
      showAlert('Success', 'Server configuration deleted.');
    } catch (error) {
      showAlert('Error', 'Failed to delete configuration.');
      console.error('Error deleting server:', error);
    }
  };

  const handleSetAsCurrent = async (serverId: string) => {
    try {
      const savedConfigs = await AsyncStorage.getItem('servers');
      const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];

      // Update all servers of this type to be not current
      const updatedServers = allServers.map(server => {
        if (server.serverType === serverType) {
          return {
            ...server,
            current: server.serverId === serverId
          };
        }
        return server;
      });

      await AsyncStorage.setItem('servers', JSON.stringify(updatedServers));
      await loadServers();
      showAlert('Success', 'Current server updated.');
    } catch (error) {
      showAlert('Error', 'Failed to update current server.');
      console.error('Error updating current server:', error);
    }
  };

  const toggleServerSelection = (serverId: string) => {
    // If already selected, deselect; otherwise select this server
    setSelectedServerId(prev => prev === serverId ? null : serverId);
    setInlineEditingId(null); // Close any open inline edit
  };

  const renderServerItem = ({ item }: { item: ServerConfig }) => (
    <View style={styles.serverItem}>
      {inlineEditingId === item.serverId ? (
        // Inline editing mode
        <View style={styles.inlineEditContainer}>
          <TextInput
            style={styles.inlineEditInput}
            value={inlineEditValue}
            onChangeText={setInlineEditValue}
            autoCapitalize="none"
            autoFocus
            placeholder="Enter Server URL"
            placeholderTextColor="#777777"
          />
          <View style={styles.inlineEditActions}>
            <Pressable onPress={cancelInlineEdit} style={styles.textButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={saveInlineEdit} style={styles.textButton}>
              <AntDesign name="check" size={18} color="#4CAF50" />
            </Pressable>
          </View>
        </View>
      ) : (
        // View mode
        <>
          <View style={styles.serverItemHeader}>
            <Pressable
              onPress={() => toggleServerSelection(item.serverId)}
              style={styles.serverUrlTouchable}
            >
              <Text style={styles.serverItemUrl}>{item.serverUrl}</Text>
            </Pressable>

            {item.current ? (
              <MaterialIcons name="check-circle" size={22} color="#535aff" />
            ) : (
              <Pressable
                onPress={() => handleSetAsCurrent(item.serverId)}
                style={styles.setCurrentButton}
              >
                <MaterialIcons name="radio-button-unchecked" size={20} color="#535aff" />
              </Pressable>
            )}
          </View>

          {selectedServerId === item.serverId && (
            <View style={styles.actionButtonsContainer}>
              <Pressable onPress={() => startInlineEdit(item)} style={styles.actionButton}>
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(item.serverId)}
                style={[styles.actionButton, item.current && styles.disabledButton]}
                disabled={item.current}
              >
                <Text style={[styles.deleteText, item.current && styles.disabledText]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{`${serverName} Configuration`}</Text>

      {(editingId || isAddingNew) ? (
        <View style={styles.configGroup}>
          <Text style={styles.configGroupHeader}>
            {editingId ? 'Edit Server' : 'Add New Server'}
          </Text>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Set as Current Server</Text>
            <Switch
              value={isCurrent}
              onValueChange={toggleCurrent}
              style={styles.switch}
              thumbColor={isCurrent ? '#535aff' : '#ccc'}
              trackColor={{ false: '#e0e0e0', true: '#a5afff' }}
              accessibilityLabel="Toggle server current state"
            />
          </View>

          <TextInput
            style={[styles.input]}
            placeholder="Enter Server Base URL"
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            placeholderTextColor={'#777777'}
            submitBehavior={'blurAndSubmit'}
          />

          <View style={styles.buttonContainer}>
            <Pressable onPress={handleCancel} style={styles.cancelBtn}>
              <AntDesign name="close" size={20} color="#fff" />
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.saveBtn}>
              <AntDesign name="check" size={20} color="#fff" />
              <Text style={styles.buttonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.serverListHeader}>
            <Text style={styles.serverListTitle}>Server URLs</Text>
            <Pressable onPress={handleAddNew} style={styles.addButton}>
              <AntDesign name="plus" size={16} color="#fff" />
            </Pressable>
          </View>

          {serverConfigs.length > 0 ? (
            <FlatList
              data={serverConfigs}
              renderItem={renderServerItem}
              keyExtractor={(item) => item.serverId}
              style={styles.serverList}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No server URLs configured</Text>
              <Pressable onPress={handleAddNew} style={styles.emptyStateButton}>
                <AntDesign name="plus" size={16} color="#fff" style={styles.emptyStateButtonIcon} />
                <Text style={styles.emptyStateButtonText}>Add Your First Server</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    fontSize: 16,
    borderRadius: 12,
    padding: 10,
    paddingLeft: 20,
    marginVertical: 20,
    marginHorizontal: 10,
    color: '#ffffff',
    backgroundColor: '#111111'
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#535aff',
    borderRadius: 25,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#454545',
    borderRadius: 25,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 10,
    marginTop: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  switch: {
    marginVertical: 5,
  },
  switchLabel: {
    fontSize: 16,
  },
  configGroup: {
    marginBottom: 20,
    backgroundColor: '#202020',
    borderRadius: 15,
    padding: 15,
  },
  configGroupHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginHorizontal: 15
  },
  serverListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  serverListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#535aff',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverList: {
    marginBottom: 20,
  },
  serverItem: {
    backgroundColor: '#202020',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    marginHorizontal: 5,
  },
  serverItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serverUrlTouchable: {
    flex: 1,
    padding: 5,
  },
  serverItemUrl: {
    fontSize: 16,
    fontWeight: '500',
  },
  setCurrentButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  editText: {
    color: '#535aff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteText: {
    color: '#ff4d4d',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#777',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
  },
  emptyStateText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: '#535aff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyStateButtonIcon: {
    marginRight: 8,
  },
  inlineEditContainer: {
    width: '100%',
  },
  inlineEditInput: {
    fontSize: 16,
    padding: 8,
    backgroundColor: '#111111',
    borderRadius: 6,
    color: '#ffffff',
    marginBottom: 10,
  },
  inlineEditActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  cancelText: {
    color: '#999',
    fontSize: 16,
  }
});

export default ServerConfiguration;