import React, { useState, useEffect } from 'react';
import { TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/utils/platform';
import ContextMenu from 'react-native-context-menu-view';
import { SUBTITLE_LANGUAGES } from '@/utils/Subtitles';
import BottomSpacing from '@/components/BottomSpacing';
import { View, Text } from '@/components/Themed';

const COLORS = {
    background: '#1a1a1a',
    primary: '#535aff',
    surface: '#242424',
    surfaceAlt: '#2a2a2e',
    border: '#333338',
    text: '#ffffff',
    textMuted: '#9a9aa3',
    textDim: '#5a5a63',
    danger: '#ff5a5a',
};

const OpenSubtitlesConfigScreen: React.FC = () => {
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

    const contextMenuActions = SUBTITLE_LANGUAGES.map(lang => ({
        title: lang.name,
        systemIcon: selectedLanguages.includes(lang.code) ? 'checkmark.circle.fill' : 'circle',
    }));

    const handleContextMenuPress = (e: { nativeEvent: { index: number } }) => {
        const lang = SUBTITLE_LANGUAGES[e.nativeEvent.index];
        if (lang) toggleLanguage(lang.code);
    };

    const renderLanguageMenu = () => (
        <ContextMenu actions={contextMenuActions} dropdownMenuMode onPress={handleContextMenuPress}>
            <View style={styles.menuButton}>
                <Ionicons name="language-outline" size={20} color={COLORS.textMuted} />
                <Text style={styles.menuButtonText}>Add Language</Text>
                <Ionicons name="chevron-down-outline" size={20} color={COLORS.textMuted} />
            </View>
        </ContextMenu>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading configuration...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>

                <View style={styles.header}>
                    <Text style={styles.title}>OpenSubtitles</Text>
                    <Text style={styles.subtitle}>
                        Configure your OpenSubtitles preferences
                    </Text>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollView}
                >
                    <View style={styles.form}>
                        <View style={styles.card}>
                            <Text style={styles.label}>API Key</Text>
                            <View style={styles.segmentedControl}>
                                {[true, false].map((isDefault) => {
                                    const active = isDefault ? useDefaultKey : !useDefaultKey;
                                    return (
                                        <TouchableOpacity
                                            key={String(isDefault)}
                                            style={[styles.segment, active && styles.segmentActive]}
                                            onPress={toggleApiKeyMode}
                                        >
                                            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                                                {isDefault ? 'Default' : 'Custom API Key'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {!useDefaultKey && (
                                <>
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={[styles.input, styles.passwordInput]}
                                            value={apiKey}
                                            onChangeText={setApiKey}
                                            placeholder="Enter your OpenSubtitles API key"
                                            placeholderTextColor={COLORS.textDim}
                                            secureTextEntry={!showApiKey}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            submitBehavior='blurAndSubmit'
                                        />
                                        <TouchableOpacity style={styles.eyeButton} onPress={() => setShowApiKey(!showApiKey)}>
                                            <Ionicons name={showApiKey ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={styles.helpText}>Get your API key from OpenSubtitles.com account settings</Text>
                                </>
                            )}
                            {useDefaultKey && (
                                <View style={styles.infoBox}>
                                    <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
                                    <Text style={styles.infoText}>Using the default API key for OpenSubtitles (Rate-Limited)</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.card}>
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
                                            <Text style={styles.selectedLanguageText}>{getLanguageName(code)}</Text>
                                            {selectedLanguages.length > 1 && (
                                                <TouchableOpacity onPress={() => removeLanguage(code)} style={styles.removeButton}>
                                                    <Ionicons name="close-circle" size={18} color={COLORS.textDim} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.buttonGroup}>
                            <TouchableOpacity
                                style={[styles.button, styles.secondaryButton]}
                                onPress={clearConfiguration}
                                disabled={isSaving}
                            >
                                <Ionicons name="trash-outline" size={16} color={COLORS.text} />
                                <Text style={styles.buttonText}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.primaryButton, (!useDefaultKey && !apiKey.trim()) && styles.buttonDisabled]}
                                onPress={saveConfiguration}
                                disabled={isSaving || (!useDefaultKey && !apiKey.trim())}
                            >
                                {isSaving
                                    ? <ActivityIndicator size="small" color="#FFF" />
                                    : <><Ionicons name="save-outline" size={16} color="#FFF" /><Text style={styles.buttonText}>Save</Text></>
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
        backgroundColor: COLORS.background,
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 15,
        color: COLORS.textMuted,
    },
    header: {
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 24,
    },
    title: {
        fontSize: 30,
        fontWeight: '700',
        color: COLORS.text,
        letterSpacing: 0.3,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginTop: 6,
        lineHeight: 20,
    },
    form: {
        paddingTop: 4,
        gap: 16,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: 10,
        padding: 4,
        gap: 4,
        marginBottom: 4,
    },
    segment: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    segmentActive: {
        backgroundColor: COLORS.primary,
    },
    segmentText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    segmentTextActive: {
        color: '#FFFFFF',
    },
    input: {
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
        backgroundColor: COLORS.surfaceAlt,
        color: COLORS.text,
        fontSize: 14,
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
        top: 20,
        padding: 4,
    },
    helpText: {
        fontSize: 12,
        color: COLORS.textDim,
        marginTop: 10,
        lineHeight: 16,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(83,90,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(83,90,255,0.3)',
        marginTop: 4,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        color: COLORS.textMuted,
    },
    menuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surfaceAlt,
        gap: 8,
    },
    menuButtonText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textMuted,
    },
    selectedLanguagesContainer: {
        marginTop: 12,
        gap: 8,
    },
    selectedLanguageChip: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        gap: 10,
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectedLanguageText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
    },
    languageBadge: {
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
    },
    languageBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    removeButton: {
        padding: 2,
    },
    buttonGroup: {
        marginTop: 8,
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 6,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
    },
    secondaryButton: {
        backgroundColor: COLORS.surfaceAlt,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    buttonDisabled: {
        backgroundColor: COLORS.surfaceAlt,
        opacity: 0.5,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default OpenSubtitlesConfigScreen;