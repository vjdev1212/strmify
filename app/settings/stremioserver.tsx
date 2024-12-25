import React, { useState, useEffect } from 'react';
import { StyleSheet, Switch, Button, Alert, Pressable, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TextInput } from '@/components/Themed';

const StremioServerScreen = () => {
    const colorScheme = useColorScheme()
    const [serverUrl, setServerUrl] = useState('http://192.168.1.10:11470');

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedConfig = await AsyncStorage.getItem('stremioServerConfig');
                if (savedConfig) {
                    const { url } = JSON.parse(savedConfig);
                    setServerUrl(url);
                }
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
    },
    serverDetails: {
        marginHorizontal: 10,
        marginVertical: 30
    },
    serverLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        paddingBottom: 10
    },
    serverValue: {
        fontSize: 15,
        paddingBottom: 10
    }
});

export default StremioServerScreen;
