import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, Switch, TextInput, Pressable, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text } from '@/components/Themed';

const ServerConfig = ({ serverName, serverType, defaultUrl }) => {
    const colorScheme = useColorScheme();
    const [serverUrl, setServerUrl] = useState(defaultUrl);
    const [isDefault, setIsDefault] = useState(false);
    const [isEnabled, setIsEnabled] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedConfigs = await AsyncStorage.getItem('servers');
                const servers = savedConfigs ? JSON.parse(savedConfigs) : [];
                const currentServer = servers.find(server => server.serverType === serverType);

                if (currentServer) {
                    setServerUrl(currentServer.serverUrl || defaultUrl);
                    setIsDefault(currentServer.isDefault);
                    setIsEnabled(currentServer.enabled);
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };

        loadSettings();
    }, [serverType, defaultUrl]);

    const handleSave = async () => {
        if (!serverUrl.trim()) {
            Alert.alert('Error', 'Please enter a valid server URL.');
            return;
        }

        const newServerConfig = {
            serverId: `${serverType}-${Date.now()}`,  // Unique ID based on serverType and timestamp
            serverType,
            serverName,
            serverUrl: serverUrl.trim(),
            enabled: isEnabled,
            isDefault,
        };

        try {
            const savedConfigs = await AsyncStorage.getItem('servers');
            const servers = savedConfigs ? JSON.parse(savedConfigs) : [];
            const updatedServers = servers.filter(server => server.serverType !== serverType); // Remove old server config
            updatedServers.push(newServerConfig);

            await AsyncStorage.setItem('servers', JSON.stringify(updatedServers));
            Alert.alert('Success', `${serverName} server configuration saved.`);
        } catch (error) {
            Alert.alert('Error', 'Failed to save configuration.');
            console.error('Error saving settings:', error);
        }
    };

    const toggleDefault = () => {
        setIsDefault(prevState => !prevState);
    };

    const toggleEnabled = () => {
        setIsEnabled(prevState => !prevState);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>{`${serverName} Configuration`}</Text>
            <View style={styles.serverConfigContainer}>
                {/* Server Settings Group */}
                <View style={styles.configGroup}>
                    <Text style={styles.configGroupHeader}>Server Settings</Text>

                    <View style={styles.switchContainer}>
                        <Text style={styles.switchLabel}>Enable Server</Text>
                        <Switch
                            value={isEnabled}
                            onValueChange={toggleEnabled}
                            style={styles.switch}
                            thumbColor={isEnabled ? '#535aff' : '#ccc'}
                            trackColor={{ false: '#e0e0e0', true: '#a5afff' }}
                        />
                    </View>

                    <View style={styles.switchContainer}>
                        <Text style={styles.switchLabel}>Default Server</Text>
                        <Switch
                            value={isDefault}
                            onValueChange={toggleDefault}
                            style={styles.switch}
                            thumbColor={isDefault ? '#535aff' : '#ccc'}
                            trackColor={{ false: '#e0e0e0', true: '#a5afff' }}
                        />
                    </View>

                    <TextInput
                        style={[styles.input, colorScheme === 'dark' ? styles.darkInput : styles.lightInput]}
                        placeholder="Enter Server Base URL"
                        value={serverUrl}
                        onChangeText={setServerUrl}
                        placeholderTextColor="#888888"
                        autoCapitalize="none"
                    />

                    <Pressable onPress={handleSave}>
                        <Text style={styles.saveBtn}>Save</Text>
                    </Pressable>
                </View>

                {/* Display Server Details */}
                <View style={styles.serverDetails}>
                    <Text style={styles.serverLabel}>Enabled:</Text>
                    <Text style={styles.serverValue}>{isEnabled ? 'Yes' : 'No'}</Text>

                    <Text style={styles.serverLabel}>Server Url:</Text>
                    <Text style={styles.serverValue}>{serverUrl}</Text>

                    <Text style={styles.serverLabel}>Default Server:</Text>
                    <Text style={styles.serverValue}>{isDefault ? 'Yes' : 'No'}</Text>
                </View>
            </View>
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
        marginVertical: 30,
        marginHorizontal: 10,
    },
    lightInput: {
        backgroundColor: '#f0f0f0',
        color: '#000',
    },
    darkInput: {
        backgroundColor: '#1f1f1f',
        color: '#fff',
    },
    saveBtn: {
        marginTop: 10,
        textAlign: 'center',
        backgroundColor: '#535aff',
        paddingVertical: 12,
        borderRadius: 25,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        width: '50%',
        marginHorizontal: '25%',
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
    serverDetails: {
        marginHorizontal: 10,
        marginVertical: 10,
    },
    serverLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        paddingBottom: 10,
    },
    serverValue: {
        fontSize: 15,
        paddingBottom: 10,
    },
    serverConfigContainer: {
        marginVertical: 10,
    },
    configGroup: {
        marginBottom: 20,
    },
    configGroupHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
});

export default ServerConfig;
