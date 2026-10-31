import React, { useEffect, useState } from 'react';
import { Platform, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { NativeSwitch, NativeTextInput } from '@/components/native-ui-controls';
import { View } from '@/components/Themed';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import { WebMenu } from '@/components/WebMenuView';
import { useTheme } from '@/context/ThemeContext';
import { confirmAction, showAlert } from '@/utils/platform';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { discoverStremioServers, type DiscoveredStremioServer } from '@/utils/stremioServerDiscovery';

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

type ConnectionStatus = Record<string, 'checking' | 'connected' | 'disconnected' | 'error' | undefined>;

const SERVERS_KEY = StorageKeys.SERVERS_KEY;
const DEFAULT_SERVER_ID = 'default-localhost';
const DEFAULT_SERVER_URL = 'http://127.0.0.1:11470';
const DEFAULT_SERVER_NAME = 'Local';

const isDefaultServer = (serverId: string) => serverId === DEFAULT_SERVER_ID;

const getDefaultServer = (serverType: string, serverName: string): ServerConfig => ({
  serverId: DEFAULT_SERVER_ID,
  serverType,
  serverName: DEFAULT_SERVER_NAME,
  serverUrl: DEFAULT_SERVER_URL,
  current: true,
});

const ServerConfiguration: React.FC<ServerConfigProps> = ({ serverName, serverType, defaultUrl }) => {
  const { colors } = useTheme();
  const [serverUrl, setServerUrl] = useState(defaultUrl);
  const [serverLabel, setServerLabel] = useState(`${serverName} Server`);
  const [isCurrent, setIsCurrent] = useState(false);
  const [serverConfigs, setServerConfigs] = useState<ServerConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [expandedServerId, setExpandedServerId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({});
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveredStremioServer[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryMessage, setDiscoveryMessage] = useState('');

  const loadServers = async () => {
    try {
      const savedConfigs = storageService.getItem(SERVERS_KEY);
      const servers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];
      setServerConfigs(servers.filter((server) => server.serverType === serverType));
    } catch (error) {
      console.error('Error loading server settings:', error);
      showAlert('Error', 'Failed to load server configuration.');
    }
  };

  useEffect(() => {
    const ensureDefaultServerExists = async () => {
      try {
        const savedConfigs = storageService.getItem(SERVERS_KEY);
        let allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];
        let serversOfType = allServers.filter((server) => server.serverType === serverType);
        let hasChanges = false;

        if (!serversOfType.some((server) => server.serverId === DEFAULT_SERVER_ID)) {
          const defaultServer = getDefaultServer(serverType, serverName);
          defaultServer.current = !serversOfType.some((server) => server.current);
          allServers = [...allServers, defaultServer];
          serversOfType = [...serversOfType, defaultServer];
          hasChanges = true;
        } else {
          const defaultNameNeedsUpdate = allServers.some((server) => (
            server.serverId === DEFAULT_SERVER_ID && server.serverName !== DEFAULT_SERVER_NAME
          ));
          allServers = allServers.map((server) => (
            server.serverId === DEFAULT_SERVER_ID && server.serverName !== DEFAULT_SERVER_NAME
              ? { ...server, serverName: DEFAULT_SERVER_NAME }
              : server
          ));
          serversOfType = allServers.filter((server) => server.serverType === serverType);
          hasChanges = defaultNameNeedsUpdate;
        }

        if (!serversOfType.some((server) => server.current)) {
          const fallbackServer = serversOfType.find((server) => isDefaultServer(server.serverId)) ?? serversOfType[0];
          if (fallbackServer) {
            allServers = allServers.map((server) => server.serverType === serverType
              ? { ...server, current: server.serverId === fallbackServer.serverId }
              : server);
            hasChanges = true;
          }
        }

        if (hasChanges) {
          storageService.setItem(SERVERS_KEY, JSON.stringify(allServers));
        }
        await loadServers();
      } catch (error) {
        console.error('Error ensuring default server:', error);
        showAlert('Error', 'Failed to initialize server settings.');
      }
    };

    void ensureDefaultServerExists();
  }, [serverName, serverType]);

  const checkServerConnection = async (
    server: ServerConfig,
  ): Promise<Exclude<ConnectionStatus[string], 'checking' | undefined>> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(server.serverUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { Accept: '*/*' },
      });
      return response.ok || response.status < 500 ? 'connected' : 'disconnected';
    } catch (error) {
      return error instanceof Error && error.name === 'AbortError' ? 'disconnected' : 'error';
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const checkAllConnections = async () => {
    if (serverConfigs.length === 0) return;
    setConnectionStatus(Object.fromEntries(serverConfigs.map((server) => [server.serverId, 'checking'])));
    const results = await Promise.all(
      serverConfigs.map(async (server) => [server.serverId, await checkServerConnection(server)] as const),
    );
    setConnectionStatus(Object.fromEntries(results));
  };

  useEffect(() => {
    if (serverConfigs.length > 0) void checkAllConnections();
  }, [serverConfigs]);

  const refreshConnection = async (server: ServerConfig) => {
    setConnectionStatus((current) => ({ ...current, [server.serverId]: 'checking' }));
    const status = await checkServerConnection(server);
    setConnectionStatus((current) => ({ ...current, [server.serverId]: status }));
  };

  const discoverServers = async () => {
    setDiscoveredServers([]);
    setIsDiscovering(true);
    setDiscoveryMessage('Searching this local /24 for Stremio on ports 11470 and 12470…');
    try {
      const results = await discoverStremioServers();
      setDiscoveredServers(results);
      setDiscoveryMessage(results.length > 0
        ? `${results.length} server${results.length === 1 ? '' : 's'} found.`
        : 'No Stremio servers found on this local /24.');
    } catch (error) {
      setDiscoveredServers([]);
      setDiscoveryMessage(error instanceof Error ? error.message : 'LAN discovery failed.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const selectDiscoveredServer = (server: DiscoveredStremioServer) => {
    setEditingId(null);
    setServerUrl(server.serverUrl);
    setServerLabel(`Stremio (${server.host})`);
    setIsCurrent(!serverConfigs.some((configuredServer) => configuredServer.current));
    setIsAddingNew(true);
  };

  const getConnectionLabel = (serverId: string) => {
    switch (connectionStatus[serverId]) {
      case 'checking':
        return 'Checking connection…';
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Not responding';
      case 'error':
        return 'Connection error';
      default:
        return 'Connection not checked';
    }
  };

  const getConnectionColor = (serverId: string) => {
    switch (connectionStatus[serverId]) {
      case 'connected':
        return '#30d158';
      case 'disconnected':
      case 'error':
        return '#ff453a';
      case 'checking':
        return '#ff9f0a';
      default:
        return '#8e8e93';
    }
  };

  const getConnectionIcon = (serverId: string) => {
    switch (connectionStatus[serverId]) {
      case 'connected':
        return 'check-circle' as const;
      case 'disconnected':
      case 'error':
        return 'error' as const;
      case 'checking':
        return 'hourglass-empty' as const;
      default:
        return 'help-outline' as const;
    }
  };

  const saveServer = async () => {
    const trimmedLabel = serverLabel.trim();
    if (!trimmedLabel) {
      showAlert('Error', 'Please enter a name for this server.');
      return;
    }
    const trimmedUrl = serverUrl.trim();
    try {
      new URL(trimmedUrl);
    } catch {
      showAlert('Error', 'Please enter a valid server URL.');
      return;
    }

    try {
      const savedConfigs = storageService.getItem(SERVERS_KEY);
      const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];
      const base = isCurrent
        ? allServers.map((server) => server.serverType === serverType ? { ...server, current: false } : server)
        : allServers;
      const updated = editingId
        ? base.map((server) => server.serverId === editingId
          ? { ...server, serverName: trimmedLabel, serverUrl: trimmedUrl, current: isCurrent }
          : server)
        : [
          ...base,
          {
            serverId: `${serverType}-${Date.now()}`,
            serverType,
            serverName: trimmedLabel,
            serverUrl: trimmedUrl,
            current: isCurrent,
          },
        ];

      storageService.setItem(SERVERS_KEY, JSON.stringify(updated));
      setEditingId(null);
      setIsAddingNew(false);
      setServerUrl(defaultUrl);
      setServerLabel(`${serverName} Server`);
      setIsCurrent(false);
      await loadServers();
      showAlert('Success', `${serverName} server configuration saved.`);
    } catch (error) {
      console.error('Error saving server configuration:', error);
      showAlert('Error', 'Failed to save server configuration.');
    }
  };

  const startAddingServer = () => {
    setEditingId(null);
    setServerUrl(defaultUrl);
    setServerLabel(`${serverName} Server`);
    setIsCurrent(!serverConfigs.some((server) => server.current));
    setIsAddingNew(true);
  };

  const startEditingServer = (server: ServerConfig) => {
    setEditingId(server.serverId);
    setServerLabel(isDefaultServer(server.serverId) ? DEFAULT_SERVER_NAME : server.serverName || `${serverName} Server`);
    setServerUrl(server.serverUrl);
    setIsCurrent(server.current);
    setIsAddingNew(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setServerUrl(defaultUrl);
    setServerLabel(`${serverName} Server`);
    setIsCurrent(false);
  };

  const setCurrentServer = async (serverId: string) => {
    try {
      const savedConfigs = storageService.getItem(SERVERS_KEY);
      const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];
      const updated = allServers.map((server) => (
        server.serverType === serverType
          ? { ...server, current: server.serverId === serverId }
          : server
      ));
      storageService.setItem(SERVERS_KEY, JSON.stringify(updated));
      await loadServers();
    } catch (error) {
      console.error('Error changing current server:', error);
      showAlert('Error', 'Failed to change the active server.');
    }
  };

  const deleteServer = async (server: ServerConfig) => {
    if (isDefaultServer(server.serverId)) {
      showAlert('Info', 'The default local server cannot be removed.');
      return;
    }
    if (server.current) {
      showAlert('Error', 'Cannot delete the active server. Set another server as active first.');
      return;
    }
    if (!await confirmAction('Remove Server', 'Are you sure you want to remove this server configuration?', 'Remove')) return;
    await removeServer(server);
  };

  const removeServer = async (server: ServerConfig) => {
    try {
      const savedConfigs = storageService.getItem(SERVERS_KEY);
      const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];
      storageService.setItem(
        SERVERS_KEY,
        JSON.stringify(allServers.filter((savedServer) => savedServer.serverId !== server.serverId)),
      );
      await loadServers();
      showAlert('Success', 'Server configuration deleted.');
    } catch (error) {
      console.error('Error deleting server configuration:', error);
      showAlert('Error', 'Failed to delete server configuration.');
    }
  };

  const orderedServerConfigs = [...serverConfigs].sort(
    (serverA, serverB) => Number(serverB.current) - Number(serverA.current),
  );
  const formVisible = isAddingNew || editingId !== null;

  return (
    <SettingsPage hideScrollIndicator>
        {formVisible ? (
        <>
          <SettingsSection
            title={editingId ? 'Edit server' : 'Add server'}
            footer="Name this server and enter its base URL."
          >
            <NativeTextInput
              accessibilityLabel={`${serverName} server name`}
              value={serverLabel}
              onChangeText={setServerLabel}
              placeholder={`${serverName} Server`}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
            <NativeTextInput
              accessibilityLabel={`${serverName} server URL`}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="https://example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
            />
            {!editingId ? (
              <SettingsRow
                title="Set as current"
                trailing={
                  <NativeSwitch
                    value={isCurrent}
                    onValueChange={setIsCurrent}
                    seedColor={colors.primary}
                  />
                }
                isLast
              />
            ) : null}
          </SettingsSection>
          <SettingsSection title="Actions">
            <SettingsRow
              title="Save server"
              leading={<MaterialIcons name="check-circle-outline" size={20} color="#30d158" />}
              onPress={() => void saveServer()}
            />
            <SettingsRow
              title="Cancel"
              leading={<MaterialIcons name="close" size={20} color="#ff453a" />}
              onPress={cancelEditing}
              destructive
              isLast
            />
          </SettingsSection>
        </>
      ) : (
        <>
          <SettingsSection
            title="Refresh connections"
            footer="Check whether configured servers are reachable."
          >
            <SettingsRow
              title="Refresh"
              leading={<MaterialIcons name="refresh" size={20} color="#0a84ff" />}
              onPress={() => void checkAllConnections()}
              isLast
            />
          </SettingsSection>
          <SettingsSection
            title="Add server"
            footer="Connect to another Stremio-compatible server."
          >
            <SettingsRow
              title="Add Server"
              leading={<MaterialIcons name="add" size={20} color="#30d158" />}
              onPress={startAddingServer}
              isLast={serverType !== 'stremio'}
            />
            {serverType === 'stremio' ? (
              <SettingsRow
                title="Discover on LAN"
                detail={discoveryMessage || (Platform.OS === 'web'
                  ? 'LAN discovery is available in the iOS and Android apps.'
                  : 'Search this network for Stremio servers.')}
                leading={<MaterialIcons name="wifi-find" size={20} color="#0a84ff" />}
                onPress={() => void discoverServers()}
                disabled={isDiscovering || Platform.OS === 'web'}
                isLast={discoveredServers.length === 0}
              />
            ) : null}
          </SettingsSection>
          {discoveredServers.length > 0 ? (
            <SettingsSection title="Discovered servers" footer="Select a server to review and save it.">
              {discoveredServers.map((server, index) => (
                <SettingsRow
                  key={server.serverUrl}
                  title={server.host}
                  detail={server.serverUrl}
                  leading={<MaterialIcons name="dns" size={20} color="#30d158" />}
                  onPress={() => selectDiscoveredServer(server)}
                  isLast={index === discoveredServers.length - 1}
                />
              ))}
            </SettingsSection>
          ) : null}
          {serverConfigs.length === 0 ? (
            <SettingsSection title="Servers">
              <SettingsRow
                title="No servers configured"
                detail="Add a server URL to connect to your Stremio-compatible service."
                isLast
              />
            </SettingsSection>
          ) : orderedServerConfigs.map((server) => {
            const serverActions: MenuAction[] = [
              ...(!server.current
                ? [{ id: 'set-current', title: 'Set as Default', image: 'checkmark.circle' } satisfies MenuAction]
                : []),
              { id: 'test', title: 'Test Connection', image: 'network' },
              ...(!isDefaultServer(server.serverId)
                ? [{ id: 'edit', title: 'Edit', image: 'pencil' } satisfies MenuAction]
                : []),
              ...(!server.current && !isDefaultServer(server.serverId)
                ? [{ id: 'delete', title: 'Remove Server', image: 'trash', attributes: { destructive: true } } satisfies MenuAction]
                : []),
            ];
            const handleServerAction = (actionId: string) => {
              if (actionId === 'set-current') void setCurrentServer(server.serverId);
              else if (actionId === 'edit' && !isDefaultServer(server.serverId)) startEditingServer(server);
              else if (actionId === 'test') void refreshConnection(server);
              else if (actionId === 'delete' && !isDefaultServer(server.serverId)) void deleteServer(server);
            };
            const isExpanded = expandedServerId === server.serverId;
            const actionTrigger = (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Actions for ${server.serverName}`}
                hitSlop={10}
                onPress={(event) => event.stopPropagation()}
                style={{ padding: 8 }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.textDim} />
              </Pressable>
            );
            const actionsMenu = Platform.OS === 'web' ? (
              <WebMenu
                title={`${server.serverName} actions`}
                actions={serverActions.map((action) => ({
                  id: action.id ?? action.title,
                  title: action.title,
                  icon: action.id === 'set-current'
                    ? 'checkmark-circle-outline'
                    : action.id === 'edit'
                      ? 'create-outline'
                      : action.id === 'test'
                        ? 'git-network-outline'
                        : 'trash-outline',
                  titleColor: action.id === 'delete' ? '#ff453a' : undefined,
                  iconColor: action.id === 'delete' ? '#ff453a' : undefined,
                }))}
                onPressAction={handleServerAction}
              >
                {actionTrigger}
              </WebMenu>
            ) : (
              <MenuView
                title={`${server.serverName} actions`}
                actions={serverActions}
                onPressAction={({ nativeEvent }) => handleServerAction(nativeEvent.event)}
                colorScheme="dark"
                shouldOpenOnLongPress={false}
              >
                {actionTrigger}
              </MenuView>
            );

            return (
              <SettingsSection
                key={server.serverId}
                title={server.current ? 'Default server' : 'Server'}
                footer={`${getConnectionLabel(server.serverId)}${isDefaultServer(server.serverId) ? ' · Built-in local server' : ''}`}
              >
              <SettingsRow
                title={isDefaultServer(server.serverId) ? DEFAULT_SERVER_NAME : server.serverName || `${serverName} Server`}
                onPress={() => setExpandedServerId(isExpanded ? null : server.serverId)}
                accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${server.serverName} server details`}
                isLast={!isExpanded}
                titleAccessory={server.current
                  ? <MaterialCommunityIcons name="crown" size={18} color="#ffcc00" />
                  : undefined}
                trailing={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {actionsMenu}
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textDim}
                    />
                  </View>
                }
                leading={
                  <MaterialIcons
                    name={getConnectionIcon(server.serverId)}
                    size={20}
                    color={getConnectionColor(server.serverId)}
                  />
                }
              />
              {isExpanded ? (
                <SettingsRow
                  title=""
                  detail={server.serverUrl}
                  detailSameFont={false}
                  detailFontSize={12}
                  isLast
                />
              ) : null}
              </SettingsSection>
            );
          })}
        </>
        )}
    </SettingsPage>
  );
};

export default ServerConfiguration;
