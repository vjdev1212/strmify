import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Switch, TextInput, Pressable, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { View, Text } from '@/components/Themed';
import { confirmAction, showAlert } from '@/utils/platform';
import { MaterialIcons } from '@expo/vector-icons';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { Colors } from '@/constants/theme';

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

interface ConnectionStatus {
  [serverId: string]: 'checking' | 'connected' | 'disconnected' | 'error';
}

const SERVERS_KEY = StorageKeys.SERVERS_KEY;
const DEFAULT_SERVER_ID = 'default-localhost';
const DEFAULT_SERVER_URL = 'http://127.0.0.1:11470';

const isDefaultServer = (serverId: string) => serverId === DEFAULT_SERVER_ID;

const getDefaultServer = (serverType: string, serverName: string): ServerConfig => ({
  serverId: DEFAULT_SERVER_ID,
  serverType,
  serverName,
  serverUrl: DEFAULT_SERVER_URL,
  current: true,
});

const ServerConfiguration: React.FC<ServerConfigProps> = ({ serverName, serverType, defaultUrl }) => {
  const [serverUrl, setServerUrl] = useState<string>(defaultUrl);
  const [isCurrent, setIsCurrent] = useState<boolean>(false);
  const [serverConfigs, setServerConfigs] = useState<ServerConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');
  const [animatedValues, setAnimatedValues] = useState<{ [key: string]: { rotation: Animated.Value, height: Animated.Value } }>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({});

  useEffect(() => {
    ensureDefaultServerExists();
  }, [serverType]);

  useEffect(() => {
    const newAnimatedValues: { [key: string]: { rotation: Animated.Value, height: Animated.Value } } = {};
    serverConfigs.forEach(server => {
      newAnimatedValues[server.serverId] = {
        rotation: new Animated.Value(0),
        height: new Animated.Value(0)
      };
    });
    setAnimatedValues(newAnimatedValues);
  }, [serverConfigs]);

  useEffect(() => {
    if (serverConfigs.length > 0) {
      checkAllConnections();
    }
  }, [serverConfigs]);

  const ensureDefaultServerExists = async () => {
    try {
      const savedConfigs = storageService.getItem(SERVERS_KEY);
      const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];

      const serversOfType = allServers.filter(s => s.serverType === serverType);
      const defaultExists = serversOfType.some(s => s.serverId === DEFAULT_SERVER_ID);

      if (!defaultExists) {
        const defaultServer = getDefaultServer(serverType, serverName);
        // If no servers of this type yet, make the default current
        const hasCurrent = serversOfType.some(s => s.current);
        defaultServer.current = !hasCurrent;

        const updatedAll = [...allServers, defaultServer];
        storageService.setItem(SERVERS_KEY, JSON.stringify(updatedAll));
      }

      await loadServers();
    } catch (error) {
      console.error('Error ensuring default server:', error);
    }
  };

  const loadServers = async () => {
    try {
      const savedConfigs = storageService.getItem(SERVERS_KEY);
      const servers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];
      const filteredServers = servers.filter(server => server.serverType === serverType);

      setServerConfigs(filteredServers);

      // Only open the "add new" form if there are somehow no servers at all
      // (shouldn't happen after ensureDefaultServerExists, but just in case)
      if (filteredServers.length === 0) {
        setServerUrl(defaultUrl);
        setIsCurrent(true);
        setIsAddingNew(true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const checkServerConnection = async (server: ServerConfig): Promise<'connected' | 'disconnected' | 'error'> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(server.serverUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Accept': '*/*',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status < 500) {
        return 'connected';
      } else {
        return 'disconnected';
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return 'disconnected';
      }
      return 'error';
    }
  };

  const checkAllConnections = async () => {
    const newStatus: ConnectionStatus = {};

    serverConfigs.forEach(server => {
      newStatus[server.serverId] = 'checking';
    });
    setConnectionStatus(newStatus);

    const promises = serverConfigs.map(async (server) => {
      const status = await checkServerConnection(server);
      return { serverId: server.serverId, status };
    });

    const results = await Promise.all(promises);

    const finalStatus: ConnectionStatus = {};
    results.forEach(({ serverId, status }) => {
      finalStatus[serverId] = status;
    });

    setConnectionStatus(finalStatus);
  };

  const refreshConnection = async (serverId: string) => {
    const server = serverConfigs.find(s => s.serverId === serverId);
    if (!server) return;

    setConnectionStatus(prev => ({ ...prev, [serverId]: 'checking' }));
    const status = await checkServerConnection(server);
    setConnectionStatus(prev => ({ ...prev, [serverId]: status }));
  };

  const renderConnectionIndicator = (serverId: string) => {
    const status = connectionStatus[serverId];

    switch (status) {
      case 'checking':
        return <ActivityIndicator size="small" color={Colors.textDim} />;
      case 'connected':
        return <View style={[styles.dot, styles.dotConnected]} />;
      case 'disconnected':
        return <View style={[styles.dot, styles.dotDisconnected]} />;
      case 'error':
        return <View style={[styles.dot, styles.dotError]} />;
      default:
        return <View style={[styles.dot, styles.dotUnknown]} />;
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
      const savedConfigs = storageService.getItem(SERVERS_KEY);
      const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];

      let updatedAllServers: ServerConfig[];
      let configToSave: ServerConfig;

      const otherServersOfSameType = isCurrent ?
        allServers.map(server =>
          server.serverType === serverType ? { ...server, current: false } : server
        ) :
        allServers;

      if (editingId) {
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
        configToSave = {
          serverId: `${serverType}-${Date.now()}`,
          serverType,
          serverName,
          serverUrl: serverUrl.trim(),
          current: isCurrent,
        };

        updatedAllServers = [...otherServersOfSameType, configToSave];
      }

      storageService.setItem(SERVERS_KEY, JSON.stringify(updatedAllServers));

      setEditingId(null);
      setIsAddingNew(false);
      setServerUrl(defaultUrl);
      setIsCurrent(false);
      setSelectedServerId(null);
      setInlineEditingId(null);
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
    setIsCurrent(serverConfigs.length === 0);
    setIsAddingNew(true);
    setSelectedServerId(null);
    setInlineEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setServerUrl(defaultUrl);
    setIsCurrent(false);
    setSelectedServerId(null);
    setInlineEditingId(null);
  };

  const toggleCurrent = useCallback(() => setIsCurrent(prev => !prev), []);

  const startInlineEdit = (server: ServerConfig) => {
    setInlineEditingId(server.serverId);
    setInlineEditValue(server.serverUrl);
    setSelectedServerId(null);

    if (animatedValues[server.serverId]) {
      const { rotation, height } = animatedValues[server.serverId];
      Animated.parallel([
        Animated.timing(rotation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(height, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        })
      ]).start();
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineEditValue('');
  };

  const toggleServerSelection = (serverId: string) => {
    const isCurrentlySelected = selectedServerId === serverId;
    const newSelectedId = isCurrentlySelected ? null : serverId;

    setSelectedServerId(newSelectedId);
    setInlineEditingId(null);

    if (animatedValues[serverId]) {
      const { rotation, height } = animatedValues[serverId];

      Animated.parallel([
        Animated.timing(rotation, {
          toValue: isCurrentlySelected ? 0 : 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(height, {
          toValue: isCurrentlySelected ? 0 : 48,
          duration: 200,
          useNativeDriver: false,
        })
      ]).start();
    }
  };

  const saveInlineEdit = async () => {
    if (!inlineEditValue.trim() || !isValidUrl(inlineEditValue)) {
      showAlert('Error', 'Please enter a valid server URL.');
      return;
    }

    try {
      const savedConfigs = storageService.getItem(SERVERS_KEY);
      const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];

      const updatedAllServers = allServers.map(server =>
        server.serverId === inlineEditingId ? { ...server, serverUrl: inlineEditValue.trim() } : server
      );

      storageService.setItem(SERVERS_KEY, JSON.stringify(updatedAllServers));

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
    // Guard: default server is never removable
    if (isDefaultServer(serverId)) {
      showAlert('Info', 'The default local server cannot be removed.');
      return;
    }

    const serverToDelete = serverConfigs.find(server => server.serverId === serverId);
    if (serverToDelete?.current) {
      showAlert('Error', 'Cannot delete the current server. Please set another server as current first.');
      return;
    }

    const confirmed = await confirmAction(
      'Delete Server',
      'Are you sure you want to delete this server configuration?',
      'Delete'
    );
    if (!confirmed) return;

    try {
      const savedConfigs = storageService.getItem(SERVERS_KEY);
      const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];
      const updatedAllServers = allServers.filter(server => server.serverId !== serverId);
      storageService.setItem(SERVERS_KEY, JSON.stringify(updatedAllServers));
      setSelectedServerId(null);
      await loadServers();
      showAlert('Success', 'Server configuration deleted.');
    } catch (error) {
      showAlert('Error', 'Failed to delete configuration.');
    }
  };

  const handleSetAsCurrent = async (serverId: string) => {
    try {
      const savedConfigs = storageService.getItem(SERVERS_KEY);
      const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];

      const updatedServers = allServers.map(server => {
        if (server.serverType === serverType) {
          return {
            ...server,
            current: server.serverId === serverId
          };
        }
        return server;
      });

      storageService.setItem(SERVERS_KEY, JSON.stringify(updatedServers));
      await loadServers();

      setSelectedServerId(null);
      if (animatedValues[serverId]) {
        const { rotation, height } = animatedValues[serverId];
        Animated.parallel([
          Animated.timing(rotation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(height, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          })
        ]).start();
      }
    } catch (error) {
      showAlert('Error', 'Failed to update current server.');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{serverName}</Text>
        <Text style={styles.subtitle}>Manage server connections</Text>
      </View>

      {(editingId || isAddingNew) && (
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.formGroup}>
              <View style={styles.formRow}>
                <View style={styles.formLabel}>
                  <Text style={styles.labelText}>Current Server</Text>
                  <Text style={styles.labelHint}>Set as active</Text>
                </View>
                <Switch
                  value={isCurrent}
                  onValueChange={toggleCurrent}
                  trackColor={{ false: Colors.primaryBorder, true: Colors.primary }}
                  thumbColor={Colors.text}
                  ios_backgroundColor={Colors.primaryBorder}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Server URL</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="https://example.com"
                placeholderTextColor={Colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.buttonRow}>
              <Pressable style={styles.btnCancel} onPress={handleCancel}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.btnSave} onPress={handleSave}>
                <Text style={styles.btnSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {!editingId && !isAddingNew && (
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sectionTitle}>Servers</Text>
              <Text style={styles.sectionCount}>{serverConfigs.length} configured</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={styles.iconBtn}
                onPress={checkAllConnections}
                disabled={Object.values(connectionStatus).some(status => status === 'checking')}
              >
                <MaterialIcons
                  name="refresh"
                  size={20}
                  color={Object.values(connectionStatus).some(s => s === 'checking') ? Colors.textDim : Colors.primary}
                />
              </Pressable>
              <Pressable style={styles.addBtn} onPress={handleAddNew}>
                <MaterialIcons name="add" size={18} color={Colors.text} />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>

          {serverConfigs.length > 0 ? (
            <View style={styles.serverList}>
              {serverConfigs.map((item) => (
                <View key={item.serverId} style={styles.card}>
                  {inlineEditingId === item.serverId ? (
                    <View style={styles.editContainer}>
                      <View style={styles.formGroup}>
                        <Text style={styles.inputLabel}>Server URL</Text>
                        <TextInput
                          style={styles.input}
                          value={inlineEditValue}
                          onChangeText={setInlineEditValue}
                          placeholder="https://example.com"
                          placeholderTextColor={Colors.textDim}
                          autoCapitalize="none"
                          autoCorrect={false}
                          autoFocus
                        />
                      </View>
                      <View style={styles.buttonRow}>
                        <Pressable style={styles.btnCancel} onPress={cancelInlineEdit}>
                          <Text style={styles.btnCancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable style={styles.btnSave} onPress={saveInlineEdit}>
                          <Text style={styles.btnSaveText}>Save</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Pressable
                        style={styles.serverItem}
                        onPress={() => toggleServerSelection(item.serverId)}
                      >
                        <View style={styles.serverMain}>
                          <View style={styles.statusIndicator}>
                            {renderConnectionIndicator(item.serverId)}
                          </View>
                          <View style={styles.serverDetails}>
                            <View style={styles.serverNameRow}>
                              <Text style={styles.serverUrl} numberOfLines={1}>
                                {item.serverUrl}
                              </Text>
                              {isDefaultServer(item.serverId) && (
                                <View style={styles.defaultBadge}>
                                  <Text style={styles.defaultBadgeText}>built-in</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.serverStatus}>
                              {connectionStatus[item.serverId] === 'checking' ? 'Checking connection' :
                                connectionStatus[item.serverId] === 'connected' ? 'Connected' :
                                  connectionStatus[item.serverId] === 'disconnected' ? 'Disconnected' : 'Connection error'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.serverEnd}>
                          {item.current ? (
                            <View style={styles.activeBadge}>
                              <MaterialIcons name="check-circle" size={18} color="#30D158" />
                            </View>
                          ) : (
                            <Animated.View style={{
                              transform: [{
                                rotate: animatedValues[item.serverId]?.rotation.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['0deg', '90deg']
                                }) || '0deg'
                              }]
                            }}>
                              <MaterialIcons name="chevron-right" size={22} color={Colors.textDim} />
                            </Animated.View>
                          )}
                        </View>
                      </Pressable>

                      {selectedServerId === item.serverId && (
                        <Animated.View style={[
                          styles.actionBar,
                          {
                            height: animatedValues[item.serverId]?.height || 48,
                            opacity: animatedValues[item.serverId]?.height.interpolate({
                              inputRange: [0, 48],
                              outputRange: [0, 1]
                            }) || 1
                          }
                        ]}>
                          <Pressable
                            style={styles.actionBtn}
                            onPress={() => refreshConnection(item.serverId)}
                          >
                            <MaterialIcons name="wifi-tethering" size={16} color="#535aff" />
                            <Text style={styles.actionBtnText}>Test</Text>
                          </Pressable>

                          {/* Default server is read-only — no Edit action */}
                          {!isDefaultServer(item.serverId) && (
                            <Pressable
                              style={styles.actionBtn}
                              onPress={() => startInlineEdit(item)}
                            >
                              <MaterialIcons name="edit" size={16} color="#535aff" />
                              <Text style={styles.actionBtnText}>Edit</Text>
                            </Pressable>
                          )}

                          {!item.current && (
                            <Pressable
                              style={styles.actionBtn}
                              onPress={() => handleSetAsCurrent(item.serverId)}
                            >
                              <MaterialIcons name="check-circle-outline" size={16} color="#30D158" />
                              <Text style={[styles.actionBtnText, { color: '#30D158' }]}>Activate</Text>
                            </Pressable>
                          )}

                          {/* Default server cannot be deleted — hide the button entirely */}
                          {!isDefaultServer(item.serverId) && (
                            <Pressable
                              style={[styles.actionBtn, item.current && styles.disabledBtn]}
                              onPress={() => handleDelete(item.serverId)}
                              disabled={item.current}
                            >
                              <MaterialIcons name="delete-outline" size={16} color={item.current ? Colors.textDim : '#FF453A'} />
                              <Text style={[styles.actionBtnDanger, item.current && styles.disabledText]}>
                                Delete
                              </Text>
                            </Pressable>
                          )}
                        </Animated.View>
                      )}
                    </>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="dns" size={40} color={Colors.textDim} />
              <Text style={styles.emptyTitle}>No servers configured</Text>
              <Text style={styles.emptyText}>Add your first server to get started</Text>
              <Pressable style={styles.emptyBtn} onPress={handleAddNew}>
                <Text style={styles.emptyBtnText}>Add Server</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionCount: {
    fontSize: 14,
    color: Colors.textDim,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  serverList: {
    gap: 10,
  },
  card: {
    backgroundColor: Colors.primarySurface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  formGroup: {
    padding: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formLabel: {
    flex: 1,
  },
  labelText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  labelHint: {
    fontSize: 13,
    color: Colors.textDim,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  input: {
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.primarySurface,
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  btnCancel: {
    flex: 1,
    backgroundColor: Colors.primarySurface,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  btnSave: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSaveText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  serverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  serverMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  serverEnd: {
    marginLeft: 12,
  },
  statusIndicator: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotConnected: {
    backgroundColor: '#30D158',
  },
  dotDisconnected: {
    backgroundColor: '#FF453A',
  },
  dotError: {
    backgroundColor: '#FF453A',
  },
  dotUnknown: {
    backgroundColor: Colors.textDim,
  },
  serverDetails: {
    flex: 1,
  },
  serverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  serverUrl: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    flexShrink: 1,
  },
  defaultBadge: {
    backgroundColor: Colors.primaryBorder,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  serverStatus: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundMid,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    overflow: 'hidden',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  actionBtnDanger: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF453A',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  disabledText: {
    color: Colors.textDim,
  },
  editContainer: {
    padding: 0,
  },
  emptyState: {
    backgroundColor: Colors.primarySurface,
    borderRadius: 12,
    paddingVertical: 56,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textDim,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
});

export default ServerConfiguration;