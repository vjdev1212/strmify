import React, { useState, useEffect } from 'react';
import { StyleSheet, Switch, Button, Alert, Pressable, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TextInput } from '@/components/Themed';

const TorrServerScreen = () => {
    const colorScheme = useColorScheme();
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
            <Text style={styles.header}>TorrServer Configuration</Text>           
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
        paddingHorizontal: 5
    },
    label: {
        fontSize: 16,
    },
    input: {
        fontSize: 16,
        borderRadius: 12,
        padding: 10,
        paddingLeft: 20,
        marginTop: 10,
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
        margin: 'auto'
    }
});

export default TorrServerScreen;
