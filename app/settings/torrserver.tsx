import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, Pressable, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TextInput } from '@/components/Themed';

const TorrServerScreen = () => {
    const colorScheme = useColorScheme();
    const [serverUrl, setServerUrl] = useState('http://192.168.1.10:5665');
    const [isDefault, setIsDefault] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedConfig = await AsyncStorage.getItem('torrServerConfig');
                const defaultServer = await AsyncStorage.getItem('defaultServer');
                if (savedConfig) {
                    const { url } = JSON.parse(savedConfig);
                    setServerUrl(url);
                }
                if (defaultServer === 'torrserver') {
                    setIsDefault(true);
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
            await AsyncStorage.setItem('torrServerConfig', JSON.stringify(config));
            Alert.alert('Success', 'TorrServer configuration saved.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save configuration.');
            console.error('Error saving settings:', error);
        }
    };

    const handleSetDefault = async () => {
        try {
            await AsyncStorage.setItem('defaultServer', 'torrserver');
            setIsDefault(true);
            Alert.alert('Success', 'TorrServer set as default.');
        } catch (error) {
            Alert.alert('Error', 'Failed to set default server.');
            console.error('Error setting default server:', error);
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

            <Pressable onPress={handleSetDefault} disabled={isDefault}>
                <Text style={[styles.defaultBtn, isDefault && styles.disabledBtn]}>
                    {isDefault ? 'Default Server' : 'Set as Default'}
                </Text>
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
        marginHorizontal: '25%',
    },
    defaultBtn: {
        marginTop: 20,
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
    disabledBtn: {
        backgroundColor: '#ccc',
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
});

export default TorrServerScreen;
