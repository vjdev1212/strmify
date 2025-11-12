import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Switch, TextInput, Pressable, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { View, Text } from '@/components/Themed';
import { confirmAction, showAlert } from '@/utils/platform';
import { MaterialIcons } from '@expo/vector-icons';
import { StorageKeys, storageService } from '@/utils/StorageService';

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
    loadServers();
  }, [serverType]);

  useEffect(() => {
    // Initialize animated values for each server
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
    // Check connection status for all servers when they change
    if (serverConfigs.length > 0) {
      checkAllConnections();
    }
  }, [serverConfigs]);

  const loadServers = async () => {
    try {
      const savedConfigs = storageService.getItem(SERVERS_KEY);
      const servers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];
      const filteredServers = servers.filter(server => server.serverType === serverType);

      setServerConfigs(filteredServers);

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
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

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
        return 'disconnected'; // Timeout
      }
      return 'error';
    }
  };

  const checkAllConnections = async () => {
    const newStatus: ConnectionStatus = {};
    
    // Set all servers to checking state
    serverConfigs.forEach(server => {
      newStatus[server.serverId] = 'checking';
    });
    setConnectionStatus(newStatus);

    // Check each server connection
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
        return (
          <View style={styles.connectionIndicator}>
            <ActivityIndicator size="small" color="#8E8E93" />
          </View>
        );
      case 'connected':
        return (
          <View style={styles.connectionIndicator}>
            <View style={[styles.statusDot, styles.connectedDot]} />
          </View>
        );
      case 'disconnected':
        return (
          <View style={styles.connectionIndicator}>
            <View style={[styles.statusDot, styles.disconnectedDot]} />
          </View>
        );
      case 'error':
        return (
          <View style={styles.connectionIndicator}>
            <View style={[styles.statusDot, styles.errorDot]} />
          </View>
        );
      default:
        return (
          <View style={styles.connectionIndicator}>
            <View style={[styles.statusDot, styles.unknownDot]} />
          </View>
        );
    }
  };

  const getConnectionStatusText = (status: string | undefined) => {
    switch (status) {
      case 'checking':
        return 'Checking...';
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
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

    // Close any expanded rows when starting inline edit
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
          toValue: isCurrentlySelected ? 0 : 44,
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

      // Close the expanded row after setting as current
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{serverName}</Text>
      </View>

      {/* Add/Edit Form */}
      {(editingId || isAddingNew) && (
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionHeader, { paddingLeft: 25 }]}>
            {editingId ? 'EDIT SERVER' : 'ADD SERVER'}
          </Text>

          <View style={styles.settingsGroup}>
            {/* Current Server Toggle */}
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowContent}>
                <View style={styles.settingsRowLeft}>
                  <Text style={styles.settingsRowLabel}>Current Server</Text>
                </View>
                <View style={styles.settingsRowRight}>
                  <Switch
                    value={isCurrent}
                    onValueChange={toggleCurrent}
                    trackColor={{ false: '#374151', true: '#535aff' }}
                    thumbColor={isCurrent ? '#ffffff' : '#d1d5db'}
                    ios_backgroundColor="#374151"
                  />
                </View>
              </View>
            </View>

            {/* Server URL Input */}
            <View style={[styles.settingsRow, styles.lastRow]}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Server URL</Text>
                <TextInput
                  style={styles.textInput}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="https://example.com"
                  placeholderTextColor="#8E8E93"
                  autoCapitalize="none"
                  autoCorrect={false}
                  submitBehavior="blurAndSubmit"
                />
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Server List */}
      {!editingId && !isAddingNew && (
        <View style={styles.settingsSection}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>SERVERS</Text>
            <View style={styles.headerActions}>
              <Pressable 
                style={styles.refreshButton} 
                onPress={checkAllConnections}
                disabled={Object.values(connectionStatus).some(status => status === 'checking')}
              >
                <MaterialIcons 
                  name="refresh" 
                  size={20} 
                  color={Object.values(connectionStatus).some(status => status === 'checking') ? '#8E8E93' : '#007AFF'} 
                />
              </Pressable>
              <Pressable style={styles.addButton} onPress={handleAddNew}>
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>
          </View>

          {serverConfigs.length > 0 ? (
            <View style={styles.settingsGroup}>
              {serverConfigs.map((item, index) => (
                <View key={item.serverId}>
                  {inlineEditingId === item.serverId ? (
                    // Inline Edit Mode
                    <View style={[styles.settingsRow, index === serverConfigs.length - 1 && styles.lastRow]}>
                      <View style={styles.inputContainer}>
                        <View style={styles.serverUrlContainer}>
                          <Text style={styles.inputLabel}>Server URL</Text>
                          <TextInput
                            style={styles.textInput}
                            value={inlineEditValue}
                            onChangeText={setInlineEditValue}
                            placeholder="https://example.com"
                            placeholderTextColor="#8E8E93"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoFocus
                            submitBehavior="blurAndSubmit"
                          />
                        </View>
                        <View style={styles.inlineActions}>
                          <Pressable style={styles.inlineActionButton} onPress={cancelInlineEdit}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                          </Pressable>
                          <Pressable style={styles.inlineActionButton} onPress={saveInlineEdit}>
                            <Text style={[styles.saveButtonText, { color: '#007AFF' }]}>Save</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ) : (
                    // Normal View Mode
                    <View style={[styles.settingsRow, index === serverConfigs.length - 1 && styles.lastRow]}>
                      <Pressable
                        style={styles.settingsRowPressable}
                        onPress={() => toggleServerSelection(item.serverId)}
                      >
                        <View style={styles.settingsRowContent}>
                          <View style={styles.settingsRowLeft}>
                            <View style={styles.serverInfo}>
                              {renderConnectionIndicator(item.serverId)}
                              <View style={styles.serverDetails}>
                                <Text style={styles.settingsRowValue}>{item.serverUrl}</Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.settingsRowRight}>
                            {item.current ? (
                              <MaterialIcons name="check" size={20} color="#007AFF" />
                            ) : (
                              <Animated.View style={{
                                transform: [{
                                  rotate: animatedValues[item.serverId]?.rotation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '90deg']
                                  }) || '0deg'
                                }]
                              }}>
                                <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
                              </Animated.View>
                            )}
                          </View>
                        </View>
                      </Pressable>

                      {selectedServerId === item.serverId && (
                        <Animated.View style={[
                          styles.settingsRowActions,
                          {
                            height: animatedValues[item.serverId]?.height || 44,
                            opacity: animatedValues[item.serverId]?.height.interpolate({
                              inputRange: [0, 44],
                              outputRange: [0, 1]
                            }) || 1
                          }
                        ]}>
                          <Pressable
                            style={styles.actionButton}
                            onPress={() => refreshConnection(item.serverId)}
                          >
                            <Text style={styles.actionButtonText}>Test</Text>
                          </Pressable>

                          <View style={styles.actionDivider} />

                          <Pressable
                            style={styles.actionButton}
                            onPress={() => startInlineEdit(item)}
                          >
                            <Text style={styles.actionButtonText}>Edit</Text>
                          </Pressable>

                          <View style={styles.actionDivider} />

                          {!item.current && (
                            <>
                              <Pressable
                                style={styles.actionButton}
                                onPress={() => handleSetAsCurrent(item.serverId)}
                              >
                                <Text style={styles.actionButtonText}>Set as Current</Text>
                              </Pressable>

                              <View style={styles.actionDivider} />
                            </>
                          )}

                          <Pressable
                            style={[styles.actionButton, item.current && styles.disabledActionButton]}
                            onPress={() => handleDelete(item.serverId)}
                            disabled={item.current}
                          >
                            <Text style={[styles.deleteActionText, item.current && styles.disabledActionText]}>
                              Delete
                            </Text>
                          </Pressable>
                        </Animated.View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No servers configured</Text>
              <Pressable style={styles.emptyStateButton} onPress={handleAddNew}>
                <Text style={styles.emptyStateButtonText}>Add Your First Server</Text>
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
    flex: 1
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2C2C2E',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingsSection: {
    marginTop: 35,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    textTransform: 'uppercase',
    paddingLeft: 4,
    paddingBottom: 10
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  settingsGroup: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  settingsRow: {
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 0.5,
    borderBottomColor: '#2C2C2E',
    minHeight: 44,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  settingsRowPressable: {
    flex: 1,
  },
  settingsRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  settingsRowLeft: {
    flex: 1,
  },
  settingsRowRight: {
    marginLeft: 16,
  },
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serverDetails: {
    flex: 1,
  },
  connectionIndicator: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectedDot: {
    backgroundColor: '#30D158',
  },
  disconnectedDot: {
    backgroundColor: '#FF3B30',
  },
  unknownDot: {
    backgroundColor: '#8E8E93',
  },
  errorDot: {
    backgroundColor: '#FF3B30',
  },
  connectionStatusText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  settingsRowLabel: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  settingsRowValue: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  settingsRowActions: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#48484A',
  },
  actionButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  deleteActionText: {
    fontSize: 17,
    color: '#FF3B30',
    fontWeight: '400',
  },
  disabledActionButton: {
    opacity: 0.3,
  },
  disabledActionText: {
    color: '#8E8E93',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '400',
  },
  textInput: {
    fontSize: 17,
    color: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 0,
    borderRadius: 12,
    backgroundColor: '#303030',
    borderColor: '#48484A',
    marginVertical: 10
  },
  inlineActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  inlineActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  saveButtonText: {
    fontSize: 17,
    color: '#ffffff',
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 17,
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyStateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyStateButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  serverUrlContainer: {
    borderBottomWidth: 0.5,
    paddingBottom: 10,
    borderBottomColor: '#2C2C2E',
  }
});

export default ServerConfiguration;