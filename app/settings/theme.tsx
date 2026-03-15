import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, StatusBar } from '@/components/Themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import BottomSpacing from '@/components/BottomSpacing';
import { useTheme } from '@/context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ThemePreset = {
  id: string;
  label: string;
  primary: string;
  background: string;
  description: string;
};

const THEME_PRESETS: ThemePreset[] = [
  { id: 'dark', label: 'Dark', primary: '#666666', background: '#101010', description: 'Default dark' },
  { id: 'violet', label: 'Violet', primary: '#535aff', background: '#0d0b2e', description: 'Default deep space' },
  { id: 'crimson', label: 'Crimson', primary: '#ff3b5c', background: '#1a0a0e', description: 'Bold & cinematic' },
  { id: 'emerald', label: 'Emerald', primary: '#00e57a', background: '#061a0f', description: 'Fresh & electric' },
  { id: 'amber', label: 'Amber', primary: '#ffb830', background: '#160f00', description: 'Warm & golden' },
  { id: 'cyan', label: 'Cyan', primary: '#00c8ff', background: '#040f1a', description: 'Icy & sharp' },
  { id: 'rose', label: 'Rose', primary: '#ff5fa3', background: '#1a0812', description: 'Soft neon glow' },
  { id: 'lime', label: 'Lime', primary: '#aaff00', background: '#0a1200', description: 'Acid & alive' },
  { id: 'slate', label: 'Slate', primary: '#a0b4cc', background: '#0a0e14', description: 'Subdued & refined' },
];

const SectionHeader = ({ title, textMuted }: { title: string; textMuted: string }) => (
  <Text style={[styles.sectionHeader, { color: textMuted }]}>{title}</Text>
);

const PresetCard = ({
  preset,
  isSelected,
  onPress,
}: {
  preset: ThemePreset;
  isSelected: boolean;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  const primaryAlpha20 = preset.primary + '33';
  const primaryAlpha60 = preset.primary + '99';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.presetCardWrapper}
    >
      <Animated.View
        style={[
          styles.presetCard,
          {
            backgroundColor: preset.background,
            borderColor: isSelected ? preset.primary : 'rgba(255,255,255,0.08)',
            borderWidth: isSelected ? 1.5 : 1,
          },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.presetPreview}>
          <View style={[styles.previewBlob, { backgroundColor: primaryAlpha20 }]} />
          <View style={styles.previewHeader}>
            <View style={[styles.previewDot, { backgroundColor: preset.primary }]} />
            <View style={[styles.previewBar, { backgroundColor: primaryAlpha60, width: '45%' }]} />
          </View>
          {[0.9, 0.7, 0.5].map((opacity, i) => (
            <View key={i} style={styles.previewRow}>
              <View style={[styles.previewIcon, { backgroundColor: preset.primary + '26' }]}>
                <View style={[styles.previewIconDot, { backgroundColor: preset.primary, opacity }]} />
              </View>
              <View style={styles.previewRowBars}>
                <View style={[styles.previewBar, { backgroundColor: 'rgba(255,255,255,0.25)', width: `${55 - i * 10}%` }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.presetLabelRow}>
          <View>
            <Text style={styles.presetLabel}>{preset.label}</Text>
            <Text style={styles.presetDescription}>{preset.description}</Text>
          </View>
          {isSelected && (
            <View style={[styles.selectedBadge, { backgroundColor: preset.primary + '26', borderColor: preset.primary + '66' }]}>
              <Ionicons name="checkmark" size={14} color={preset.primary} />
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
};

const ThemeColorScreen = () => {
  const router = useRouter();
  const { savedTheme, applyTheme, colors } = useTheme();

  const [selectedPreset, setSelectedPreset] = useState<string>(savedTheme.presetId);
  const [selectedAccent, setSelectedAccent] = useState<string>(savedTheme.primary);

  const currentPreset = THEME_PRESETS.find(p => p.id === selectedPreset) ?? THEME_PRESETS[0];

  const handlePresetSelect = async (preset: ThemePreset) => {
    if (await isHapticsSupported()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPreset(preset.id);
    setSelectedAccent(preset.primary);
  };

  const handleApply = async () => {
    if (await isHapticsSupported()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    applyTheme({ presetId: selectedPreset, primary: selectedAccent, background: currentPreset.background });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Appearance</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Choose a theme that feels like you
          </Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View style={[styles.livePreview, { backgroundColor: currentPreset.background, borderColor: selectedAccent + '33' }]}>
            <View style={styles.livePreviewLeft}>
              <View style={[styles.liveAccentDot, { backgroundColor: selectedAccent }]} />
              <View>
                <Text style={styles.livePreviewLabel}>Live Preview</Text>
                <Text style={[styles.livePreviewAccent, { color: selectedAccent }]}>
                  {currentPreset.label} · {selectedAccent.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={[styles.livePreviewBadge, { backgroundColor: selectedAccent + '1a', borderColor: selectedAccent + '40' }]}>
              <Ionicons name="color-palette-outline" size={16} color={selectedAccent} />
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title="SELECT THEME" textMuted={colors.textMuted} />
            <View style={styles.presetsGrid}>
              {THEME_PRESETS.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isSelected={selectedPreset === preset.id}
                  onPress={() => handlePresetSelect(preset)}
                />
              ))}
            </View>
          </View>

          <View style={styles.buttonSection}>
            <Pressable
              style={({ pressed }) => [
                styles.applyButton,
                { backgroundColor: selectedAccent, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleApply}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.text} />
              <Text style={[styles.applyText, { color: colors.text }]}>Apply Theme</Text>
            </Pressable>
            <BottomSpacing space={30} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const CONTAINER_WIDTH = Math.min(SCREEN_WIDTH, 600) - 20 * 2;
const CARD_WIDTH = (CONTAINER_WIDTH - 10) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    maxWidth: 780,
    alignSelf: 'center',
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 40,
    maxWidth: 780,
    width: '100%'
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
    letterSpacing: 0.1,
  },
  livePreview: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  livePreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveAccentDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  livePreviewLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.3,
  },
  livePreviewAccent: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 1,
  },
  livePreviewBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetCardWrapper: {
    width: CARD_WIDTH,
  },
  presetCard: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
  },
  presetPreview: {
    height: 90,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10,
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
  },
  previewBlob: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    top: -10,
    right: -10,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewBar: {
    height: 5,
    borderRadius: 3,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewIconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewRowBars: {
    flex: 1,
  },
  presetLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  presetDescription: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 1,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSection: {
    paddingTop: 8,
  },
  applyButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    marginBottom: 20,
    maxWidth: 200,
  },
  applyText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2
  },
});

export default ThemeColorScreen;