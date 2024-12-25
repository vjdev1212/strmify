import React, { useState, useEffect } from 'react';
import { StyleSheet, Switch, Button, Alert, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TextInput } from '@/components/Themed';

const StremioServerScreen = () => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [serverUrl, setServerUrl] = useState('');

    // Load settings from AsyncStorage on component mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedConfig = await AsyncStorage.getItem('stremioServerConfig');
                if (savedConfig) {
                    const { enabled, url } = JSON.parse(savedConfig);
                    setIsEnabled(enabled);
                    setServerUrl(url);
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };

        loadSettings();
    }, []);

    const handleSave = async () => {
        if (!isEnabled) {
            Alert.alert('Error', 'Please enable the server to save.');
            return;
        }
        if (isEnabled && !serverUrl.trim()) {
            Alert.alert('Error', 'Please enter a valid server URL.');
            return;
        }

        const config = {
            enabled: isEnabled,
            url: serverUrl.trim(),
        };

        try {
            await AsyncStorage.setItem('stremioServerConfig', JSON.stringify(config));
            Alert.alert('Success', 'Stremio server configuration saved.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save configuration.');
            console.error('Error saving settings:', error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Stremio Server Configuration</Text>

            <View style={styles.row}>
                <Text style={styles.label}>Enable Server</Text>
                <Switch
                    value={isEnabled}
                    onValueChange={(value) => setIsEnabled(value)}
                    trackColor={{ false: '#767577', true: '#edeef2' }}
                    thumbColor={isEnabled ? '#535aff' : '#f4f3f4'}
                />
            </View>

            <TextInput
                style={[styles.input]}
                placeholder="Enter Server Base URL"
                value={serverUrl}
                onChangeText={setServerUrl}
                editable={isEnabled}
                autoCapitalize="none"
            />

            <Pressable onPress={handleSave}>
                <Text style={styles.saveBtn}>Save</Text>
            </Pressable>
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
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    label: {
        fontSize: 16,
    },
    input: {
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#888',
        borderRadius: 25,
        padding: 10,
        paddingLeft: 20,
        marginTop: 10,
        marginBottom: 30,
    },
    saveBtn: {
        marginTop: 10,
        textAlign: 'center',
        backgroundColor: '#535aff',
        margin: 'auto',
        paddingHorizontal: 50,
        paddingVertical: 15,
        borderRadius: 25,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff'
    }
});

export default StremioServerScreen;
