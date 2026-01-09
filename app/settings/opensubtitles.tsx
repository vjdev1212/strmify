import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import * as Haptics from 'expo-haptics';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { WebMenu } from '@/components/WebMenuView';
import { SUBTITLE_LANGUAGES } from '@/utils/Subtitles';
import BottomSpacing from '@/components/BottomSpacing';


const OpenSubtitlesConfigScreen: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [useDefaultKey, setUseDefaultKey] = useState(true);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        loadSavedConfig();
    }, []);

    const loadSavedConfig = async () => {
        setIsLoading(true);
        try {
            const savedApiKey = storageService.getItem(StorageKeys.OPENSUBTITLES_API_KEY);
            const savedLanguages = storageService.getItem(StorageKeys.SUBTITLE_LANGUAGES_KEY);

            if (savedApiKey === undefined || savedApiKey === null || savedApiKey === '') {
                setUseDefaultKey(true);
                setApiKey('');
            } else {
                setUseDefaultKey(false);
                setApiKey(savedApiKey);
            }

            if (savedLanguages) {
                try {
                    const languages = JSON.parse(savedLanguages);
                    if (Array.isArray(languages) && languages.length > 0) {
                        setSelectedLanguages(languages);
                    }
                } catch (e) {
                    console.error('Failed to parse saved languages:', e);
                }
            }
        } catch (error) {
            console.error('Failed to load saved config:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleLanguage = async (languageCode: string) => {
        setSelectedLanguages(prev => {
            if (prev.includes(languageCode)) {
                // Don't allow removing the last language
                if (prev.length === 1) {
                    showAlert('Error', 'You must have at least one language selected');
                    return prev;
                }
                return prev.filter(code => code !== languageCode);
            } else {
                return [...prev, languageCode];
            }
        });
    };

    const removeLanguage = async (languageCode: string) => {

        if (selectedLanguages.length === 1) {
            showAlert('Error', 'You must have at least one language selected');
            return;
        }

        setSelectedLanguages(prev => prev.filter(code => code !== languageCode));
    };

    const toggleApiKeyMode = async () => {

        const newUseDefault = !useDefaultKey;
        setUseDefaultKey(newUseDefault);
        
        if (newUseDefault) {
            setApiKey('');
        }
    };

    const saveConfiguration = async () => {

        if (!useDefaultKey && !apiKey.trim()) {
            showAlert('Error', 'Please enter an API key or use the default key');
            return;
        }

        if (selectedLanguages.length === 0) {
            showAlert('Error', 'Please select at least one language');
            return;
        }

        setIsSaving(true);

        try {
            if (useDefaultKey) {
                // Set to undefined to use default/built-in key
                storageService.removeItem(StorageKeys.OPENSUBTITLES_API_KEY);
            } else {
                storageService.setItem(StorageKeys.OPENSUBTITLES_API_KEY, apiKey.trim());
            }
            
            storageService.setItem(StorageKeys.SUBTITLE_LANGUAGES_KEY, JSON.stringify(selectedLanguages));

            showAlert('Configuration Saved', 'Your OpenSubtitles configuration has been saved successfully.');
        } catch (error) {
            showAlert('Save Failed', `Failed to save configuration:\n${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const clearConfiguration = async () => {
        showAlert('Clear Configuration', 'Are you sure you want to clear the saved configuration?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear',
                style: 'destructive',
                onPress: async () => {
                    try {
                        storageService.removeItem(StorageKeys.OPENSUBTITLES_API_KEY);
                        storageService.removeItem(StorageKeys.SUBTITLE_LANGUAGES_KEY);
                        setApiKey('');
                        setUseDefaultKey(true);
                        setSelectedLanguages(['en']);
                        showAlert('Success', 'Configuration cleared successfully');
                    } catch (error) {
                        showAlert('Error', 'Failed to clear configuration');
                    }
                },
            },
        ]);
    };

    const getLanguageName = (code: string) => {
        return SUBTITLE_LANGUAGES.find(lang => lang.code === code)?.name || code;
    };

    const buildLanguageMenuActions = (): MenuAction[] => {
        return SUBTITLE_LANGUAGES.map(lang => ({
            id: `lang-${lang.code}`,
            title: lang.name,
            state: selectedLanguages.includes(lang.code) ? ('on' as const) : undefined,
            titleColor: selectedLanguages.includes(lang.code) ? '#007AFF' : '#FFFFFF',
            image: Platform.select({
                ios: selectedLanguages.includes(lang.code) ? 'checkmark' : undefined,
                default: undefined,
            }),
        }));
    };

    const handleLanguageMenuAction = (event: { nativeEvent: { event: string } }) => {
        const actionId = event.nativeEvent.event;
        const languageCode = actionId.replace('lang-', '');
        toggleLanguage(languageCode);
    };

    const languageMenuActions = buildLanguageMenuActions();

    const webMenuActions = SUBTITLE_LANGUAGES.map(lang => ({
        title: lang.name,
        systemIcon: selectedLanguages.includes(lang.code) ? 'checkmark' : undefined,
        state: selectedLanguages.includes(lang.code) ? 'on' : 'off',
    }));

    const renderLanguageMenu = () => {
        if (Platform.OS === 'web') {
            return (
                <WebMenu
                    title="Select Languages"
                    actions={webMenuActions as any}
                    onPressAction={(action: any) => {
                        const language = SUBTITLE_LANGUAGES.find(lang => lang.name === action.title);
                        if (language) {
                            toggleLanguage(language.code);
                        }
                    }}
                >
                    <TouchableOpacity style={styles.menuButton}>
                        <Ionicons name="language-outline" size={20} color="#bbb" />
                        <Text style={styles.menuButtonText}>Add Language</Text>
                        <Ionicons name="chevron-down-outline" size={20} color="#bbb" />
                    </TouchableOpacity>
                </WebMenu>
            );
        }

        return (
            <MenuView
                actions={languageMenuActions}
                onPressAction={handleLanguageMenuAction}
                themeVariant='dark'
                shouldOpenOnLongPress={false}
            >
                <TouchableOpacity style={styles.menuButton}>
                    <Ionicons name="language-outline" size={20} color="#bbb" />
                    <Text style={styles.menuButtonText}>Add Language</Text>
                    <Ionicons name="chevron-down-outline" size={20} color="#bbb" />
                </TouchableOpacity>
            </MenuView>
        );
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
                style={styles.keyboardAvoid}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Ionicons name="settings-outline" size={40} color="#535aff" />
                        <Text style={styles.title}>OpenSubtitles Configuration</Text>
                        <Text style={styles.subtitle}>
                            Configure your API credentials and subtitle preferences
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>API Key</Text>
                            
                            <TouchableOpacity 
                                style={styles.toggleContainer}
                                onPress={toggleApiKeyMode}
                            >
                                <View style={styles.toggleOption}>
                                    <View style={[
                                        styles.radioButton,
                                        useDefaultKey && styles.radioButtonSelected
                                    ]}>
                                        {useDefaultKey && <View style={styles.radioButtonInner} />}
                                    </View>
                                    <Text style={styles.toggleText}>Default</Text>
                                </View>
                                <View style={styles.toggleOption}>
                                    <View style={[
                                        styles.radioButton,
                                        !useDefaultKey && styles.radioButtonSelected
                                    ]}>
                                        {!useDefaultKey && <View style={styles.radioButtonInner} />}
                                    </View>
                                    <Text style={styles.toggleText}>Custom API Key</Text>
                                </View>
                            </TouchableOpacity>

                            {!useDefaultKey && (
                                <>
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={[styles.input, styles.passwordInput]}
                                            value={apiKey}
                                            onChangeText={setApiKey}
                                            placeholder="Enter your OpenSubtitles API key"
                                            placeholderTextColor="#aaa"
                                            secureTextEntry={!showApiKey}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            submitBehavior='blurAndSubmit'
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
                                </>
                            )}
                            
                            {useDefaultKey && (
                                <View style={styles.infoBox}>
                                    <Ionicons name="information-circle-outline" size={18} color="#535aff" />
                                    <Text style={styles.infoText}>
                                        Using the default API key for OpenSubtitles (Rate-Limited)
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Preferred Languages</Text>
                            <Text style={[styles.helpText, { marginBottom: 12, marginTop: 0 }]}>
                                Select languages for subtitle search (in order of preference)
                            </Text>

                            {renderLanguageMenu()}

                            {selectedLanguages.length > 0 && (
                                <View style={styles.selectedLanguagesContainer}>
                                    {selectedLanguages.map((code, index) => (
                                        <View key={code} style={styles.selectedLanguageChip}>
                                            <View style={styles.languageBadge}>
                                                <Text style={styles.languageBadgeText}>{index + 1}</Text>
                                            </View>
                                            <Text style={styles.selectedLanguageText}>
                                                {getLanguageName(code)}
                                            </Text>
                                            {selectedLanguages.length > 1 && (
                                                <TouchableOpacity
                                                    onPress={() => removeLanguage(code)}
                                                    style={styles.removeButton}
                                                >
                                                    <Ionicons name="close-circle" size={18} color="#777777" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.buttonGroup}>
                            <TouchableOpacity
                                style={[styles.button, styles.clearButton]}
                                onPress={clearConfiguration}
                                disabled={isSaving}
                            >
                                <Ionicons name="trash-outline" size={16} color="#FFF" />
                                <Text style={styles.clearButtonText}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    styles.saveButton,
                                    (!useDefaultKey && !apiKey.trim()) && styles.disabledButton,
                                ]}
                                onPress={saveConfiguration}
                                disabled={isSaving || (!useDefaultKey && !apiKey.trim())}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="save-outline" size={16} color="#FFF" />
                                        <Text style={styles.buttonText}>Save</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                    <BottomSpacing space={50} />
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
        padding: 15,
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
        padding: 10,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 10,
    },
    toggleContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 12,
        padding: 12,
        backgroundColor: '#202020',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#303030',
    },
    toggleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#777777',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        borderColor: '#535aff',
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#535aff',
    },
    toggleText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '500',
    },
    input: {
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#101010',
        color: '#fff',
    },
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
        backgroundColor: '#202020',
    },
    eyeButton: {
        position: 'absolute',
        right: 10,
        top: 8,
        padding: 4,
    },
    helpText: {
        fontSize: 12,
        color: '#aaa',
        marginTop: 10,
        lineHeight: 16,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: 'rgba(83, 90, 255, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(83, 90, 255, 0.3)',
        marginTop: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#bbb',
        lineHeight: 18,
    },
    menuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#202020',
        borderWidth: 1,
        borderColor: '#303030',
        gap: 8,
    },
    menuButtonText: {
        flex: 1,
        fontSize: 14,
        color: '#bbb',
        fontWeight: '500',
    },
    selectedLanguagesContainer: {
        marginTop: 12,
        gap: 8,
    },
    selectedLanguageChip: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#202020',
        gap: 8,
    },
    selectedLanguageText: {
        flex: 1,
        fontSize: 14,
        color: '#fff',
        fontWeight: '500',
    },
    languageBadge: {
        backgroundColor: '#777777',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    languageBadgeText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: 'bold',
    },
    removeButton: {
        padding: 2,
    },
    buttonGroup: {
        marginTop: 30,
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 25,
        gap: 6,
    },
    saveButton: {
        backgroundColor: '#535aff',
    },
    clearButton: {
        backgroundColor: '#303030',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    clearButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    disabledButton: {
        backgroundColor: '#303030',
    },
});

export default OpenSubtitlesConfigScreen;