import React, { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeSwitch, NativeTextInput } from '@/components/native-ui-controls';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import { useTheme } from '@/context/ThemeContext';
import { confirmAction, showAlert } from '@/utils/platform';
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

type ConnectionStatus = Record<string, 'checking' | 'connected' | 'disconnected' | 'error' | undefined>;

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
  const { colors } = useTheme();
  const [serverUrl, setServerUrl] = useState(defaultUrl);
  const [isCurrent, setIsCurrent] = useState(false);
  const [serverConfigs, setServerConfigs] = useState<ServerConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({});

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
        const allServers: ServerConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [];
        const serversOfType = allServers.filter((server) => server.serverType === serverType);
        if (!serversOfType.some((server) => server.serverId === DEFAULT_SERVER_ID)) {
          const defaultServer = getDefaultServer(serverType, serverName);
          defaultServer.current = !serversOfType.some((server) => server.current);
          storageService.setItem(SERVERS_KEY, JSON.stringify([...allServers, defaultServer]));
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

  const saveServer = async () => {
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
          ? { ...server, serverUrl: trimmedUrl, current: isCurrent }
          : server)
        : [
          ...base,
          {
            serverId: `${serverType}-${Date.now()}`,
            serverType,
            serverName,
            serverUrl: trimmedUrl,
            current: isCurrent,
          },
        ];

      storageService.setItem(SERVERS_KEY, JSON.stringify(updated));
      setEditingId(null);
      setIsAddingNew(false);
      setServerUrl(defaultUrl);
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
    setIsCurrent(!serverConfigs.some((server) => server.current));
    setIsAddingNew(true);
  };

  const startEditingServer = (server: ServerConfig) => {
    setEditingId(server.serverId);
    setServerUrl(server.serverUrl);
    setIsCurrent(server.current);
    setIsAddingNew(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setServerUrl(defaultUrl);
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
    if (!await confirmAction('Delete Server', 'Are you sure you want to delete this server configuration?', 'Delete')) {
      return;
    }

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

  const formVisible = isAddingNew || editingId !== null;

  return (
    <SettingsPage>
      {formVisible ? (
        <>
          <SettingsSection
            title={editingId ? 'Edit server' : 'Add server'}
            footer="Enter the base URL for your Stremio-compatible server."
          >
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
          </SettingsSection>
          {!editingId ? (
            <SettingsSection title="Playback">
              <SettingsRow
                title="Make active server"
                detail="Use this server for playback"
                trailing={
                  <NativeSwitch
                    value={isCurrent}
                    onValueChange={setIsCurrent}
                    seedColor={colors.primary}
                  />
                }
              />
            </SettingsSection>
          ) : null}
          <SettingsSection title="Actions">
            <SettingsRow title="Save server" onPress={() => void saveServer()} />
            <SettingsRow title="Cancel" onPress={cancelEditing} destructive isLast />
          </SettingsSection>
        </>
      ) : (
        <>
          <SettingsSection
            title={`${serverName} servers`}
            footer={`${serverConfigs.length} configured. Select a server to use for playback.`}
          >
            <SettingsRow
              title="Refresh connections"
              detail="Check whether configured servers are reachable"
              leading={<MaterialIcons name="refresh" size={20} color={colors.primary} />}
              onPress={() => void checkAllConnections()}
            />
            <SettingsRow
              title="Add server"
              detail="Connect to another Stremio-compatible server"
              leading={<MaterialIcons name="add" size={20} color={colors.primary} />}
              onPress={startAddingServer}
              isLast
            />
          </SettingsSection>
          {serverConfigs.length === 0 ? (
            <SettingsSection title="Servers">
              <SettingsRow
                title="No servers configured"
                detail="Add a server URL to connect to your Stremio-compatible service."
                isLast
              />
            </SettingsSection>
          ) : serverConfigs.map((server) => (
            <SettingsSection
              key={server.serverId}
              title={server.current ? 'Active server' : 'Server'}
              footer={`${getConnectionLabel(server.serverId)}${isDefaultServer(server.serverId) ? ' · Built-in local server' : ''}`}
            >
              <SettingsRow
                title={server.serverUrl}
                detail={server.current ? 'Currently used for playback' : 'Not currently active'}
                selected={server.current}
                onPress={() => {
                  if (!server.current) void setCurrentServer(server.serverId);
                }}
              />
              <SettingsRow
                title="Test connection"
                leading={<MaterialIcons name="network-check" size={20} color={colors.primary} />}
                onPress={() => void refreshConnection(server)}
              />
              <SettingsRow
                title="Edit server"
                leading={<MaterialIcons name="edit" size={20} color={colors.primary} />}
                onPress={() => startEditingServer(server)}
              />
              {!server.current ? (
                <SettingsRow
                  title="Set as active"
                  leading={<MaterialIcons name="check-circle-outline" size={20} color={colors.primary} />}
                  onPress={() => void setCurrentServer(server.serverId)}
                />
              ) : null}
              {!isDefaultServer(server.serverId) ? (
                <SettingsRow
                  title="Delete server"
                  leading={<MaterialIcons name="delete-outline" size={20} color="#ff453a" />}
                  onPress={() => void deleteServer(server)}
                  destructive
                  isLast
                />
              ) : null}
            </SettingsSection>
          ))}
        </>
      )}
    </SettingsPage>
  );
};

export default ServerConfiguration;
