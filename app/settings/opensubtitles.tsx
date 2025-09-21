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
import { Ionicons } from '@expo/vector-icons';
import OpenSubtitlesClient from '@/clients/opensubtitles';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/utils/platform';

const STORAGE_KEYS = {
    OPENSUBTITLES_API_KEY: StorageKeys.OPENSUBTITLES_API_KEY,
    OPENSUBTITLES_USER_AGENT: StorageKeys.OPENSUBTITLES_USER_AGENT,
};

const DEFAULT_USER_AGENT = 'Strmify';

const OpenSubtitlesConfigScreen: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [userAgent] = useState(DEFAULT_USER_AGENT);
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
            const savedApiKey = await storageService.getItem(STORAGE_KEYS.OPENSUBTITLES_API_KEY);
            if (savedApiKey) setApiKey(savedApiKey);
        } catch (error) {
            console.error('Failed to load saved config:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const testConnection = async () => {
        if (!apiKey.trim()) {
            showAlert('Error', 'Please enter an API key first');
            return;
        }

        setIsTestingConnection(true);
        setConnectionStatus('idle');

        try {
            const client = new OpenSubtitlesClient(userAgent, apiKey);
            const result = await client.getLanguages();

            if (result.success) {
                setConnectionStatus('success');
                showAlert(
                    'Success!',
                    'Connection to OpenSubtitles API established successfully.',
                    [{ text: 'OK', style: 'default' }]
                );
            } else {
                setConnectionStatus('error');
                showAlert(
                    'Connection Failed',
                    `Failed to connect to OpenSubtitles API:\n${result.error}`,
                    [{ text: 'OK', style: 'destructive' }]
                );
            }
        } catch (error) {
            setConnectionStatus('error');
            showAlert(
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
            showAlert('Error', 'Please enter an API key');
            return;
        }

        setIsSaving(true);

        try {
            await storageService.setItem(STORAGE_KEYS.OPENSUBTITLES_API_KEY, apiKey.trim());

            const client = new OpenSubtitlesClient(userAgent, apiKey.trim());

            showAlert(
                'Configuration Saved',
                'Your OpenSubtitles configuration has been saved successfully.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            showAlert(
                'Save Failed',
                `Failed to save configuration:\n${error instanceof Error ? error.message : 'Unknown error'}`,
                [{ text: 'OK', style: 'destructive' }]
            );
        } finally {
            setIsSaving(false);
        }
    };

    const clearConfiguration = () => {
        showAlert(
            'Clear Configuration',
            'Are you sure you want to clear the saved configuration?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await storageService.removeItem(STORAGE_KEYS.OPENSUBTITLES_API_KEY);
                            setApiKey('');
                            setConnectionStatus('idle');
                            showAlert('Success', 'Configuration cleared successfully');
                        } catch (error) {
                            showAlert('Error', 'Failed to clear configuration');
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
                    <ActivityIndicator size="large" color="#535aff" />
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
                        <Ionicons name="settings-outline" size={40} color="#535aff" />
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
                                        color="#bbb"
                                    />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.helpText}>
                                Get your API key from OpenSubtitles.com account settings
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
                                    !apiKey.trim() && styles.disabledButton,
                                ]}
                                onPress={saveConfiguration}
                                disabled={isSaving || !apiKey.trim()}
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
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 30,
        width: '100%',
        maxWidth: 780,
        margin: 'auto'
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
        color: '#bbb',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#bbb',
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
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#3a3a3a',
        color: '#fff',
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
        color: '#888',
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
        backgroundColor: '#535aff',
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
        backgroundColor: '#535aff',
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
        backgroundColor: '#555',
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
        backgroundColor: '#2d2d2d',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 10,
    },
    infoText: {
        fontSize: 14,
        color: '#bbb',
        lineHeight: 20,
    },
});

export default OpenSubtitlesConfigScreen;