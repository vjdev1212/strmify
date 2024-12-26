import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, Switch, useColorScheme, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TextInput } from '@/components/Themed';

const TorrServerScreen = () => {
    const colorScheme = useColorScheme();
    const [serverUrl, setServerUrl] = useState('http://192.168.1.10:5665');
    const [isDefault, setIsDefault] = useState(false);
    const [isEnabled, setIsEnabled] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedConfig = await AsyncStorage.getItem('torrServerConfig');
                const defaultServer = await AsyncStorage.getItem('defaultServer');
                const enabledServer = await AsyncStorage.getItem('torrServerEnabled');

                if (savedConfig) {
                    const { url } = JSON.parse(savedConfig);
                    setServerUrl(url);
                }
                setIsDefault(defaultServer === 'torrserver');
                setIsEnabled(enabledServer !== 'false'); // Default to enabled if no value is stored
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };

        loadSettings();
    }, []);

    const handleSave = async () => {
        if (!serverUrl.trim()) {
            Alert.alert('Error', 'Please enter a valid server URL.');
            return;
        }

        const config = {
            url: serverUrl.trim(),
        };

        try {
            await AsyncStorage.setItem('torrServerConfig', JSON.stringify(config));
            Alert.alert('Success', 'TorrServer configuration saved.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save configuration.');
            console.error('Error saving settings:', error);
        }
    };

    const toggleDefault = async () => {
        try {
            if (!isDefault) {
                await AsyncStorage.setItem('defaultServer', 'torrserver');
            } else {
                await AsyncStorage.removeItem('defaultServer');
            }
            setIsDefault(!isDefault);
        } catch (error) {
            Alert.alert('Error', 'Failed to update default server.');
            console.error('Error updating default server:', error);
        }
    };

    const toggleEnabled = async () => {
        try {
            const newStatus = !isEnabled;
            await AsyncStorage.setItem('torrServerEnabled', newStatus.toString());
            setIsEnabled(newStatus);
        } catch (error) {
            Alert.alert('Error', 'Failed to update server status.');
            console.error('Error updating server status:', error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>TorrServer Configuration</Text>
            <View style={styles.serverConfigContainer}>
                <View style={styles.defaultServerSwitch}>
                    <Text style={styles.switchLabel}>
                        {isEnabled ? 'Disable Server' : 'Enable Server'}
                    </Text>
                    <Switch
                        value={isEnabled}
                        onValueChange={toggleEnabled}
                        style={styles.switch}
                        thumbColor={isEnabled ? '#535aff' : '#ccc'}
                        trackColor={{ false: '#e0e0e0', true: '#a5afff' }}
                    />
                </View>

                <View style={styles.defaultServerSwitch}>
                    <Text style={styles.switchLabel}>
                        {isDefault ? 'Default Server' : 'Set as Default'}
                    </Text>
                    <Switch
                        value={isDefault}
                        onValueChange={toggleDefault}
                        style={styles.switch}
                        thumbColor={isDefault ? '#535aff' : '#ccc'}
                        trackColor={{ false: '#e0e0e0', true: '#a5afff' }}
                    />
                </View>

                <TextInput
                    style={[
                        styles.input,
                        colorScheme === 'dark' ? styles.darkInput : styles.lightInput,
                    ]}
                    placeholder="Enter Server Base URL"
                    value={serverUrl}
                    onChangeText={setServerUrl}
                    placeholderTextColor={'#888888'}
                    autoCapitalize="none"
                />

                <Pressable onPress={handleSave}>
                    <Text style={styles.saveBtn}>Save</Text>
                </Pressable>
            </View>
            <View style={styles.serverDetails}>
                <Text style={styles.serverLabel}>Server Url:</Text>
                <Text style={styles.serverValue}>{serverUrl}</Text>
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
        marginBottom: 30,
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
    defaultServerSwitch: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    switch: {
        alignSelf: 'center',
        marginVertical: 15,
    },
    switchLabel: {
        fontSize: 16,
        marginBottom: 20,
    },
    serverDetails: {
        marginHorizontal: 10,
        marginVertical: 30,
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
        marginVertical: 20,
    },
});

export default TorrServerScreen;
