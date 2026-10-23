import React, { useState, useEffect } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { showAlert } from '@/utils/platform';
import { SUBTITLE_LANGUAGES } from '@/utils/Subtitles';
import { useTheme } from '@/context/ThemeContext';
import { View, Text } from '@/components/Themed';
import { NativeTextInput } from '@/components/native-ui-controls';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import NativeFieldSelect from '@/components/native-field-select';
import { systemDarkBackground } from '@/constants/theme';

const OpenSubtitlesConfigScreen: React.FC = () => {
    const { colors } = useTheme();
    const languagePickerPlaceholder = '__select_language__';
    const [apiKey, setApiKey] = useState('');
    const [useDefaultKey, setUseDefaultKey] = useState(true);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
    const [languagePickerValue, setLanguagePickerValue] = useState(languagePickerPlaceholder);
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

    const handleLanguageSelection = (languageCode: string) => {
        if (languageCode !== languagePickerPlaceholder) {
            setSelectedLanguages((current) => current.includes(languageCode)
                ? current
                : [...current, languageCode]);
        }
        setLanguagePickerValue(languagePickerPlaceholder);
    };

    return (
        <View style={{ flex: 1, backgroundColor: systemDarkBackground }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <SettingsPage>
                    {isLoading ? (
                        <View style={{ alignItems: 'center', padding: 20, gap: 10 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{ color: colors.textMuted }}>Loading configuration...</Text>
                        </View>
                    ) : (
                        <>
                            <SettingsSection
                                title="API Key Type"
                                footer={useDefaultKey ? 'The default API key is rate-limited.' : 'Custom API keys are stored on this device.'}
                            >
                                <NativeFieldSelect
                                    label="Key Type"
                                    selectedValue={useDefaultKey ? 'default' : 'custom'}
                                    onValueChange={(value) => {
                                        if ((value === 'default') !== useDefaultKey) toggleApiKeyMode();
                                    }}
                                    options={[
                                        { label: 'Default', value: 'default' },
                                        { label: 'Custom API Key', value: 'custom' },
                                    ]}
                                />
                            </SettingsSection>

                            {!useDefaultKey ? (
                                <SettingsSection title="Custom API Key">
                                    <NativeTextInput
                                        accessibilityLabel="OpenSubtitles API key"
                                        value={apiKey}
                                        onChangeText={setApiKey}
                                        placeholder="Enter your API key"
                                        placeholderTextColor={colors.textDim}
                                        secureTextEntry={!showApiKey}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <SettingsRow
                                        title={showApiKey ? 'Hide API key' : 'Show API key'}
                                        leading={<Ionicons name={showApiKey ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.primary} />}
                                        onPress={() => setShowApiKey((visible) => !visible)}
                                        isLast
                                    />
                                </SettingsSection>
                            ) : null}

                            <SettingsSection title="Preferred Languages" footer="Languages are searched in the order shown. Keep at least one language selected.">
                                <NativeFieldSelect
                                    label="Add Language"
                                    selectedValue={languagePickerValue}
                                    onValueChange={handleLanguageSelection}
                                    options={[
                                        { label: 'Language', value: languagePickerPlaceholder },
                                        ...SUBTITLE_LANGUAGES
                                            .filter((language) => !selectedLanguages.includes(language.code))
                                            .map((language) => ({ label: language.name, value: language.code })),
                                    ]}
                                    enabled={selectedLanguages.length < SUBTITLE_LANGUAGES.length}
                                />
                                {selectedLanguages.map((code, index) => (
                                    <SettingsRow
                                        key={code}
                                        title={getLanguageName(code)}
                                        leading={<Text style={{ color: colors.textMuted }}>{index + 1}</Text>}
                                        trailing={selectedLanguages.length > 1 ? (
                                            <Ionicons name="remove-circle-outline" size={20} color={colors.textDim} />
                                        ) : null}
                                        onPress={selectedLanguages.length > 1 ? () => removeLanguage(code) : undefined}
                                        isLast={index === selectedLanguages.length - 1}
                                    />
                                ))}
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

export default OpenSubtitlesConfigScreen;