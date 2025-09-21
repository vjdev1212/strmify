import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView, 
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import OpenSubtitlesClient from '@/clients/opensubtitles';
import { StorageKeys } from '@/utils/StorageService';
import { SafeAreaView } from 'react-native-safe-area-context';

const STORAGE_KEYS = {
    API_KEY: StorageKeys.OPENSUBTITLES_API_KEY,
    USER_AGENT: StorageKeys.OPENSUBTITLES_USER_AGENT,
};

const DEFAULT_USER_AGENT = 'Strmify';

const OpenSubtitlesConfigScreen: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [userAgent, setUserAgent] = useState(DEFAULT_USER_AGENT);
    const [isLoading, setIsLoading] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [showApiKey, setShowApiKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load saved configuration on component mount
    useEffect(() => {
        loadSavedConfig();
    }, []);

    const loadSavedConfig = async () => {
        setIsLoading(true);
        try {
            const [savedApiKey, savedUserAgent] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.API_KEY),
                AsyncStorage.getItem(STORAGE_KEYS.USER_AGENT),
            ]);

            if (savedApiKey) setApiKey(savedApiKey);
            if (savedUserAgent) setUserAgent(savedUserAgent);
        } catch (error) {
            console.error('Failed to load saved config:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const testConnection = async () => {
        if (!apiKey.trim()) {
            Alert.alert('Error', 'Please enter an API key first');
            return;
        }

        setIsTestingConnection(true);
        setConnectionStatus('idle');

        try {
            const client = new OpenSubtitlesClient(userAgent, apiKey);
            const result = await client.getLanguages();

            if (result.success) {
                setConnectionStatus('success');
                Alert.alert(
                    'Success!',
                    'Connection to OpenSubtitles API established successfully.',
                    [{ text: 'OK', style: 'default' }]
                );
            } else {
                setConnectionStatus('error');
                Alert.alert(
                    'Connection Failed',
                    `Failed to connect to OpenSubtitles API:\n${result.error}`,
                    [{ text: 'OK', style: 'destructive' }]
                );
            }
        } catch (error) {
            setConnectionStatus('error');
            Alert.alert(
                'Connection Error',
                `An error occurred while testing the connection:\n${error instanceof Error ? error.message : 'Unknown error'}`,
                [{ text: 'OK', style: 'destructive' }]
            );
        } finally {
            setIsTestingConnection(false);
        }
    };

    const saveConfiguration = async () => {
        if (!apiKey.trim()) {
            Alert.alert('Error', 'Please enter an API key');
            return;
        }

        if (!userAgent.trim()) {
            Alert.alert('Error', 'Please enter a user agent');
            return;
        }

        setIsSaving(true);

        try {
            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEYS.API_KEY, apiKey.trim()),
                AsyncStorage.setItem(STORAGE_KEYS.USER_AGENT, userAgent.trim()),
            ]);

            const client = new OpenSubtitlesClient(userAgent.trim(), apiKey.trim());

            Alert.alert(
                'Configuration Saved',
                'Your OpenSubtitles configuration has been saved successfully.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            Alert.alert(
                'Save Failed',
                `Failed to save configuration:\n${error instanceof Error ? error.message : 'Unknown error'}`,
                [{ text: 'OK', style: 'destructive' }]
            );
        } finally {
            setIsSaving(false);
        }
    };

    const clearConfiguration = () => {
        Alert.alert(
            'Clear Configuration',
            'Are you sure you want to clear the saved configuration?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await Promise.all([
                                AsyncStorage.removeItem(STORAGE_KEYS.API_KEY),
                                AsyncStorage.removeItem(STORAGE_KEYS.USER_AGENT),
                            ]);
                            setApiKey('');
                            setUserAgent('MyApp v1.0');
                            setConnectionStatus('idle');
                            Alert.alert('Success', 'Configuration cleared successfully');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to clear configuration');
                        }
                    },
                },
            ]
        );
    };

    const getConnectionStatusIcon = () => {
        switch (connectionStatus) {
            case 'success':
                return <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />;
            case 'error':
                return <Ionicons name="close-circle" size={20} color="#F44336" />;
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading configuration...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Ionicons name="settings-outline" size={40} color="#007AFF" />
                        <Text style={styles.title}>OpenSubtitles Configuration</Text>
                        <Text style={styles.subtitle}>
                            Configure your API credentials to access subtitle services
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>API Key *</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    value={apiKey}
                                    onChangeText={setApiKey}
                                    placeholder="Enter your OpenSubtitles API key"
                                    secureTextEntry={!showApiKey}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() => setShowApiKey(!showApiKey)}
                                >
                                    <Ionicons
                                        name={showApiKey ? 'eye-off-outline' : 'eye-outline'}
                                        size={20}
                                        color="#666"
                                    />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.helpText}>
                                Get your API key from OpenSubtitles.com account settings
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>User Agent *</Text>
                            <TextInput
                                style={styles.input}
                                value={userAgent}
                                onChangeText={setUserAgent}
                                placeholder="e.g., MyApp v1.0"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <Text style={styles.helpText}>
                                Identify your app to the OpenSubtitles API
                            </Text>
                        </View>

                        <View style={styles.buttonGroup}>
                            <TouchableOpacity
                                style={styles.testButton}
                                onPress={testConnection}
                                disabled={isTestingConnection || !apiKey.trim()}
                            >
                                {isTestingConnection ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="wifi-outline" size={16} color="#FFF" />
                                        <Text style={styles.testButtonText}>Test Connection</Text>
                                    </>
                                )}
                                {getConnectionStatusIcon()}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.saveButton,
                                    (!apiKey.trim() || !userAgent.trim()) && styles.disabledButton,
                                ]}
                                onPress={saveConfiguration}
                                disabled={isSaving || !apiKey.trim() || !userAgent.trim()}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="save-outline" size={16} color="#FFF" />
                                        <Text style={styles.saveButtonText}>Save Configuration</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.clearButton} onPress={clearConfiguration}>
                            <Ionicons name="trash-outline" size={16} color="#F44336" />
                            <Text style={styles.clearButtonText}>Clear Configuration</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoSection}>
                        <Text style={styles.infoTitle}>About OpenSubtitles API</Text>
                        <Text style={styles.infoText}>
                            • Free tier available with rate limits{'\n'}
                            • Premium subscriptions offer higher limits{'\n'}
                            • Supports multiple subtitle formats{'\n'}
                            • Access to millions of subtitles
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 5,
        lineHeight: 22,
    },
    form: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#FFF',
    },
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeButton: {
        position: 'absolute',
        right: 12,
        top: 12,
        padding: 4,
    },
    helpText: {
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
    },
    buttonGroup: {
        gap: 12,
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2196F3',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        gap: 8,
    },
    testButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        gap: 8,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        backgroundColor: '#CCC',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F44336',
        gap: 8,
        marginTop: 10,
    },
    clearButtonText: {
        color: '#F44336',
        fontSize: 16,
        fontWeight: '600',
    },
    infoSection: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
});

export default OpenSubtitlesConfigScreen;