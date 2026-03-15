import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/utils/platform';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { WebMenu } from '@/components/WebMenuView';
import { SUBTITLE_LANGUAGES } from '@/utils/Subtitles';
import BottomSpacing from '@/components/BottomSpacing';
import { useTheme } from '@/context/ThemeContext';
import BlurGradientBackground from '@/components/BlurGradientBackground';

const OpenSubtitlesConfigScreen: React.FC = () => {
    const { colors } = useTheme();
    const [apiKey, setApiKey] = useState('');
    const [useDefaultKey, setUseDefaultKey] = useState(true);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => { loadSavedConfig(); }, []);

    const loadSavedConfig = async () => {
        setIsLoading(true);
        try {
            const savedApiKey = storageService.getItem(StorageKeys.OPENSUBTITLES_API_KEY);
            if (!savedApiKey) { setUseDefaultKey(true); setApiKey(''); }
            else { setUseDefaultKey(false); setApiKey(savedApiKey); }
            const savedLanguages = storageService.getItem(StorageKeys.SUBTITLE_LANGUAGES_KEY);
            if (savedLanguages) {
                const languages = JSON.parse(savedLanguages);
                if (Array.isArray(languages) && languages.length > 0) setSelectedLanguages(languages);
            }
        } catch (error) { console.error('Failed to load saved config:', error); }
        finally { setIsLoading(false); }
    };

    const toggleLanguage = (languageCode: string) => {
        setSelectedLanguages(prev => {
            if (prev.includes(languageCode)) {
                if (prev.length === 1) { showAlert('Error', 'You must have at least one language selected'); return prev; }
                return prev.filter(code => code !== languageCode);
            }
            return [...prev, languageCode];
        });
    };

    const removeLanguage = (languageCode: string) => {
        if (selectedLanguages.length === 1) { showAlert('Error', 'You must have at least one language selected'); return; }
        setSelectedLanguages(prev => prev.filter(code => code !== languageCode));
    };

    const toggleApiKeyMode = () => { const n = !useDefaultKey; setUseDefaultKey(n); if (n) setApiKey(''); };

    const saveConfiguration = async () => {
        if (!useDefaultKey && !apiKey.trim()) { showAlert('Error', 'Please enter an API key or use the default key'); return; }
        if (selectedLanguages.length === 0) { showAlert('Error', 'Please select at least one language'); return; }
        setIsSaving(true);
        try {
            if (useDefaultKey) storageService.removeItem(StorageKeys.OPENSUBTITLES_API_KEY);
            else storageService.setItem(StorageKeys.OPENSUBTITLES_API_KEY, apiKey.trim());
            storageService.setItem(StorageKeys.SUBTITLE_LANGUAGES_KEY, JSON.stringify(selectedLanguages));
            showAlert('Configuration Saved', 'Your OpenSubtitles configuration has been saved successfully.');
        } catch (error) { showAlert('Save Failed', `Failed to save configuration:\n${error instanceof Error ? error.message : 'Unknown error'}`); }
        finally { setIsSaving(false); }
    };

    const clearConfiguration = async () => {
        showAlert('Clear Configuration', 'Are you sure you want to clear the saved configuration?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear', style: 'destructive', onPress: async () => {
                    try {
                        storageService.removeItem(StorageKeys.OPENSUBTITLES_API_KEY);
                        storageService.removeItem(StorageKeys.SUBTITLE_LANGUAGES_KEY);
                        setApiKey(''); setUseDefaultKey(true); setSelectedLanguages(['en']);
                        showAlert('Success', 'Configuration cleared successfully');
                    } catch { showAlert('Error', 'Failed to clear configuration'); }
                }
            },
        ]);
    };

    const getLanguageName = (code: string) => SUBTITLE_LANGUAGES.find(l => l.code === code)?.name || code;

    const buildLanguageMenuActions = (): MenuAction[] => SUBTITLE_LANGUAGES.map(lang => ({
        id: `lang-${lang.code}`,
        title: lang.name,
        state: selectedLanguages.includes(lang.code) ? ('on' as const) : undefined,
        titleColor: selectedLanguages.includes(lang.code) ? '#007AFF' : '#FFFFFF'
    }));

    const handleLanguageMenuAction = (event: { nativeEvent: { event: string } }) => {
        toggleLanguage(event.nativeEvent.event.replace('lang-', ''));
    };

    const webMenuActions = SUBTITLE_LANGUAGES.map(lang => ({
        title: lang.name,
        systemIcon: selectedLanguages.includes(lang.code) ? 'checkmark' : undefined,
        state: selectedLanguages.includes(lang.code) ? 'on' : 'off',
    }));

    const renderLanguageMenu = () => {
        const btn = (
            <TouchableOpacity style={[styles.menuButton, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}>
                <Ionicons name="language-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.menuButtonText, { color: colors.textMuted }]}>Add Language</Text>
                <Ionicons name="chevron-down-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
        );
        if (Platform.OS === 'web') {
            return <WebMenu title="Select Languages" actions={webMenuActions as any} onPressAction={(action: any) => { const language = SUBTITLE_LANGUAGES.find(l => l.name === action.title); if (language) toggleLanguage(language.code); }}>{btn}</WebMenu>;
        }
        return <MenuView actions={buildLanguageMenuActions()} onPressAction={handleLanguageMenuAction} themeVariant='dark' shouldOpenOnLongPress={false}>{btn}</MenuView>;
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <BlurGradientBackground />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading configuration...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <BlurGradientBackground />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>

                {/* ✅ Fixed header — outside ScrollView */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>OpenSubtitles</Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        Configure your OpenSubtitles preferences
                    </Text>
                </View>

                {/* ✅ Only content scrolls */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollView}
                >
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>API Key</Text>
                            <TouchableOpacity style={[styles.toggleContainer, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]} onPress={toggleApiKeyMode}>
                                {[true, false].map((isDefault) => (
                                    <View key={String(isDefault)} style={styles.toggleOption}>
                                        <View style={[styles.radioButton, { borderColor: colors.textDim }, (isDefault ? useDefaultKey : !useDefaultKey) && { borderColor: colors.primary }]}>
                                            {(isDefault ? useDefaultKey : !useDefaultKey) && <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />}
                                        </View>
                                        <Text style={[styles.toggleText, { color: colors.text }]}>{isDefault ? 'Default' : 'Custom API Key'}</Text>
                                    </View>
                                ))}
                            </TouchableOpacity>
                            {!useDefaultKey && (
                                <>
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={[styles.input, styles.passwordInput, { backgroundColor: colors.primarySurface, color: colors.text }]}
                                            value={apiKey}
                                            onChangeText={setApiKey}
                                            placeholder="Enter your OpenSubtitles API key"
                                            placeholderTextColor="#aaa"
                                            secureTextEntry={!showApiKey}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            submitBehavior='blurAndSubmit'
                                        />
                                        <TouchableOpacity style={styles.eyeButton} onPress={() => setShowApiKey(!showApiKey)}>
                                            <Ionicons name={showApiKey ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={styles.helpText}>Get your API key from OpenSubtitles.com account settings</Text>
                                </>
                            )}
                            {useDefaultKey && (
                                <View style={[styles.infoBox, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}>
                                    <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                                    <Text style={[styles.infoText, { color: colors.textMuted }]}>Using the default API key for OpenSubtitles (Rate-Limited)</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Preferred Languages</Text>
                            <Text style={[styles.helpText, { marginBottom: 12, marginTop: 0 }]}>
                                Select languages for subtitle search (in order of preference)
                            </Text>
                            {renderLanguageMenu()}
                            {selectedLanguages.length > 0 && (
                                <View style={styles.selectedLanguagesContainer}>
                                    {selectedLanguages.map((code, index) => (
                                        <View key={code} style={[styles.selectedLanguageChip, { backgroundColor: colors.primarySurface }]}>
                                            <View style={[styles.languageBadge, { backgroundColor: colors.textDim }]}>
                                                <Text style={[styles.languageBadgeText, { color: colors.text }]}>{index + 1}</Text>
                                            </View>
                                            <Text style={[styles.selectedLanguageText, { color: colors.text }]}>{getLanguageName(code)}</Text>
                                            {selectedLanguages.length > 1 && (
                                                <TouchableOpacity onPress={() => removeLanguage(code)} style={styles.removeButton}>
                                                    <Ionicons name="close-circle" size={18} color={colors.textDim} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.buttonGroup}>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: colors.primaryBorder }]}
                                onPress={clearConfiguration}
                                disabled={isSaving}
                            >
                                <Ionicons name="trash-outline" size={16} color="#FFF" />
                                <Text style={[styles.buttonText, { color: colors.text }]}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: (!useDefaultKey && !apiKey.trim()) ? colors.primaryBorder : colors.primary }]}
                                onPress={saveConfiguration}
                                disabled={isSaving || (!useDefaultKey && !apiKey.trim())}
                            >
                                {isSaving
                                    ? <ActivityIndicator size="small" color="#FFF" />
                                    : <><Ionicons name="save-outline" size={16} color="#FFF" /><Text style={[styles.buttonText, { color: colors.text }]}>Save</Text></>
                                }
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
        maxWidth: 780,
        width: '100%',
        alignSelf: 'center',
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 15,
        paddingBottom: 40,
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
        alignItems: 'flex-start',
        paddingHorizontal: 15,
        paddingTop: 50,
        paddingBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 10,
        textAlign: 'left',
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'left',
        marginTop: 5,
        lineHeight: 22,
    },
    form: {
        paddingTop: 8,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
    },
    toggleContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 12,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '500',
    },
    input: {
        borderRadius: 8,
        padding: 12,
    },
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
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
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    menuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
    },
    menuButtonText: {
        flex: 1,
        fontSize: 14,
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
        gap: 8,
    },
    selectedLanguageText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    languageBadge: {
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    languageBadgeText: {
        fontSize: 12,
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
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default OpenSubtitlesConfigScreen;