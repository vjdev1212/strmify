import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { StatusBar, View } from '@/components/Themed';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import { useTheme } from '@/context/ThemeContext';
import { isHapticsSupported } from '@/utils/platform';

export type ThemePreset = {
  id: string;
  label: string;
  primary: string;
  background: string;
  description: string;
};

const THEME_PRESETS: ThemePreset[] = [
  { id: 'dark', label: 'Dark', primary: '#777777', background: '#0a0a0a', description: 'Default dark' },
  { id: 'violet', label: 'Violet', primary: '#535aff', background: '#1a1640', description: 'Default deep space' },
  { id: 'crimson', label: 'Crimson', primary: '#ff3b5c', background: '#2a1018', description: 'Bold & cinematic' },
  { id: 'emerald', label: 'Emerald', primary: '#00e57a', background: '#0d2a1a', description: 'Fresh & electric' },
  { id: 'amber', label: 'Amber', primary: '#ffb830', background: '#221800', description: 'Warm & golden' },
  { id: 'cyan', label: 'Cyan', primary: '#00c8ff', background: '#081824', description: 'Icy & sharp' },
  { id: 'rose', label: 'Rose', primary: '#ff5fa3', background: '#2a101e', description: 'Soft & vibrant' },
  { id: 'lime', label: 'Lime', primary: '#aaff00', background: '#121e00', description: 'Acid & alive' },
  { id: 'slate', label: 'Slate', primary: '#a0b4cc', background: '#10161e', description: 'Subdued & refined' },
];

export default function ThemeColorScreen() {
  const router = useRouter();
  const { savedTheme, applyTheme, colors } = useTheme();
  const [selectedPreset, setSelectedPreset] = useState(savedTheme.presetId);
  const [selectedAccent, setSelectedAccent] = useState(savedTheme.primary);
  const selected = THEME_PRESETS.find((preset) => preset.id === selectedPreset) ?? THEME_PRESETS[0];

  const selectPreset = async (preset: ThemePreset) => {
    if (await isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPreset(preset.id);
    setSelectedAccent(preset.primary);
  };

  const applySelectedTheme = async () => {
    if (await isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    applyTheme({ presetId: selected.id, primary: selectedAccent, background: selected.background });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar />
      <SettingsPage>
        <SettingsSection title="Theme" footer="Choose the colors used throughout Strmify. Your selection is applied after tapping Apply Theme.">
          {THEME_PRESETS.map((preset, index) => (
            <SettingsRow
              key={preset.id}
              title={preset.label}
              detail={preset.description}
              onPress={() => selectPreset(preset)}
              isLast={index === THEME_PRESETS.length - 1}
              leading={
                <View style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: preset.primary,
                  borderWidth: 2,
                  borderColor: colors.border,
                }} />
              }
              trailing={
                selectedPreset === preset.id
                  ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  : <Ionicons name="ellipse-outline" size={22} color={colors.textDim} />
              }
              selected={selectedPreset === preset.id}
              accessibilityLabel={`${preset.label}${selectedPreset === preset.id ? ', selected' : ''}`}
            />
          ))}
        </SettingsSection>
        <SettingsSection title="Preview">
          <SettingsRow
            title={`${selected.label} theme`}
            detail={selectedAccent.toUpperCase()}
            isLast
            leading={<Ionicons name="color-palette-outline" size={20} color={selectedAccent} />}
            trailing={<View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: selected.background }} />}
          />
        </SettingsSection>
        <SettingsSection title="Apply">
          <SettingsRow
            title="Apply Theme"
            onPress={applySelectedTheme}
            isLast
            leading={<Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />}
            trailing={<Ionicons name="chevron-forward" size={17} color={colors.textDim} />}
          />
        </SettingsSection>
      </SettingsPage>
    </View>
  );
}
