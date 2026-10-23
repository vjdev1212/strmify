import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { showAlert } from '@/utils/platform';
import { MenuView } from '@expo/ui/community/menu';
import type { MenuAction } from '@expo/ui/community/menu';
import { WebMenu } from '@/components/WebMenuView';
import { SUBTITLE_LANGUAGES } from '@/utils/Subtitles';
import { useTheme } from '@/context/ThemeContext';
import { View, Text } from '@/components/Themed';
import { NativeButton, NativeSelect, NativeTextInput } from '@/components/native-ui-controls';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import { systemDarkBackground } from '@/constants/theme';

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
        return <MenuView actions={buildLanguageMenuActions()} onPressAction={handleLanguageMenuAction} colorScheme="dark" shouldOpenOnLongPress={false}>{btn}</MenuView>;
    };

    return (
        <View style={[styles.container, { backgroundColor: systemDarkBackground }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
                <SettingsPage>
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading configuration...</Text>
                        </View>
                    ) : (
                        <>
                            <SettingsSection title="API Key" footer={useDefaultKey ? 'Configure subtitle search preferences. The default API key is rate-limited.' : 'Configure subtitle search preferences. API keys are stored on this device.'}>
                                <View style={styles.fieldContent}>
                                    <Text style={[styles.fieldLabel, { color: colors.text }]}>Key Type</Text>
                                    <NativeSelect
                                        selectedValue={useDefaultKey ? 'default' : 'custom'}
                                        onValueChange={(value) => {
                                            if ((value === 'default') !== useDefaultKey) toggleApiKeyMode();
                                        }}
                                        options={[
                                            { label: 'Default', value: 'default' },
                                            { label: 'Custom API Key', value: 'custom' },
                                        ]}
                                        style={styles.nativeControl}
                                    />
                                    {!useDefaultKey ? (
                                        <View style={styles.passwordContainer}>
                                            <NativeTextInput
                                                style={{ flex: 1 }}
                                                inputStyle={{ width: '100%', padding: 12, paddingRight: 48, backgroundColor: colors.primarySurface }}
                                                textStyle={{ color: colors.text }}
                                                seedColor={colors.primary}
                                                accessibilityLabel="OpenSubtitles API key"
                                                value={apiKey}
                                                onChangeText={setApiKey}
                                                placeholder="Enter your API key"
                                                placeholderTextColor={colors.textDim}
                                                secureTextEntry={!showApiKey}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                            <NativeButton
                                                variant="text"
                                                style={styles.eyeButton}
                                                onPress={() => setShowApiKey(!showApiKey)}
                                                accessibilityLabel={showApiKey ? 'Hide API key' : 'Show API key'}
                                                seedColor={colors.primary}
                                            >
                                                <Ionicons name={showApiKey ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                                            </NativeButton>
                                        </View>
                                    ) : null}
                                </View>
                            </SettingsSection>

                            <SettingsSection title="Preferred Languages" footer="Languages are searched in the order shown. Keep at least one language selected.">
                                <View style={styles.languageContent}>
                                    {renderLanguageMenu()}
                                    {selectedLanguages.map((code, index) => (
                                        <SettingsRow
                                            key={code}
                                            title={getLanguageName(code)}
                                            detail={`Priority ${index + 1}`}
                                            isLast={index === selectedLanguages.length - 1}
                                            leading={<Text style={{ color: colors.textMuted }}>{index + 1}</Text>}
                                            trailing={selectedLanguages.length > 1 ? (
                                                <NativeButton
                                                    variant="text"
                                                    onPress={() => removeLanguage(code)}
                                                    accessibilityLabel={`Remove ${getLanguageName(code)}`}
                                                    seedColor={colors.primary}
                                                >
                                                    <Ionicons name="remove-circle-outline" size={20} color={colors.textDim} />
                                                </NativeButton>
                                            ) : null}
                                        />
                                    ))}
                                </View>
                            </SettingsSection>

                            <SettingsSection title="Actions">
                                <SettingsRow
                                    title="Save Configuration"
                                    detail={isSaving ? 'Saving…' : undefined}
                                    onPress={saveConfiguration}
                                    disabled={isSaving || (!useDefaultKey && !apiKey.trim())}
                                    leading={<Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />}
                                />
                                <SettingsRow
                                    title="Clear Configuration"
                                    onPress={clearConfiguration}
                                    disabled={isSaving}
                                    destructive
                                    isLast
                                    leading={<Ionicons name="trash-outline" size={20} color="#ff453a" />}
                                />
                            </SettingsSection>
                        </>
                    )}
                </SettingsPage>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardAvoid: { flex: 1 },
    loadingContainer: { alignItems: 'center', padding: 20, gap: 10 },
    loadingText: { fontSize: 14 },
    fieldContent: { padding: 16, gap: 10 },
    fieldLabel: { fontSize: 15, fontWeight: '500' },
    nativeControl: { width: '100%' },
    passwordContainer: { position: 'relative' },
    eyeButton: { position: 'absolute', right: 8, top: 6, padding: 4 },
    languageContent: { paddingVertical: 8 },
    menuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
        paddingHorizontal: 16,
        gap: 10,
    },
    menuButtonText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
});

export default OpenSubtitlesConfigScreen;