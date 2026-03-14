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
import BlurGradientBackground from '@/components/BlurGradientBackground';
import BottomSpacing from '@/components/BottomSpacing';
import { useTheme } from '@/context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Preset Themes ────────────────────────────────────────────────────────────
export type ThemePreset = {
  id: string;
  label: string;
  primary: string;
  background: string;
  description: string;
};

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'violet',
    label: 'Violet',
    primary: '#535aff',
    background: '#0d0b2e',
    description: 'Default deep space',
  },
  {
    id: 'crimson',
    label: 'Crimson',
    primary: '#ff3b5c',
    background: '#1a0a0e',
    description: 'Bold & cinematic',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    primary: '#00e57a',
    background: '#061a0f',
    description: 'Fresh & electric',
  },
  {
    id: 'amber',
    label: 'Amber',
    primary: '#ffb830',
    background: '#160f00',
    description: 'Warm & golden',
  },
  {
    id: 'cyan',
    label: 'Cyan',
    primary: '#00c8ff',
    background: '#040f1a',
    description: 'Icy & sharp',
  },
  {
    id: 'rose',
    label: 'Rose',
    primary: '#ff5fa3',
    background: '#1a0812',
    description: 'Soft neon glow',
  },
  {
    id: 'lime',
    label: 'Lime',
    primary: '#aaff00',
    background: '#0a1200',
    description: 'Acid & alive',
  },
  {
    id: 'slate',
    label: 'Slate',
    primary: '#a0b4cc',
    background: '#0a0e14',
    description: 'Subdued & refined',
  },
];

// ─── Accent Color Swatches ─────────────────────────────────────────────────────
const ACCENT_COLORS = [
  '#535aff', '#ff3b5c', '#00e57a', '#ffb830',
  '#00c8ff', '#ff5fa3', '#aaff00', '#a0b4cc',
  '#9b5de5', '#f15bb5', '#fee440', '#00bbf9',
  '#ff6b35', '#7bed9f', '#eccc68', '#a29bfe',
];

// ─── Sub-components ────────────────────────────────────────────────────────────

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
        {/* Mini preview */}
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
                <View
                  style={[
                    styles.previewBar,
                    { backgroundColor: 'rgba(255,255,255,0.25)', width: `${55 - i * 10}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Label row */}
        <View style={styles.presetLabelRow}>
          <View>
            <Text style={styles.presetLabel}>{preset.label}</Text>
            <Text style={styles.presetDescription}>{preset.description}</Text>
          </View>
          {isSelected && (
            <View
              style={[
                styles.selectedBadge,
                { backgroundColor: preset.primary + '26', borderColor: preset.primary + '66' },
              ]}
            >
              <Ionicons name="checkmark" size={14} color={preset.primary} />
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
};

const AccentSwatch = ({
  color,
  isSelected,
  onPress,
}: {
  color: string;
  isSelected: boolean;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true, speed: 40 }).start()
      }
      onPressOut={() =>
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start()
      }
    >
      <Animated.View style={[styles.swatchOuter, { transform: [{ scale: scaleAnim }] }]}>
        <View
          style={[
            styles.swatchRing,
            {
              borderColor: isSelected ? color : 'transparent',
              borderWidth: isSelected ? 2 : 0,
            },
          ]}
        >
          <View style={[styles.swatchInner, { backgroundColor: color }]}>
            {isSelected && <Ionicons name="checkmark" size={12} color="#000" />}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

const ThemeColorScreen = () => {
  const router = useRouter();
  const { savedTheme, applyTheme, colors } = useTheme();

  const [selectedPreset, setSelectedPreset] = useState<string>(savedTheme.presetId);
  const [selectedAccent, setSelectedAccent] = useState<string>(savedTheme.primary);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  const currentPreset =
    THEME_PRESETS.find(p => p.id === selectedPreset) ?? THEME_PRESETS[0];

  const handlePresetSelect = async (preset: ThemePreset) => {
    if (await isHapticsSupported()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPreset(preset.id);
    setSelectedAccent(preset.primary);
  };

  const handleAccentSelect = async (color: string) => {
    if (await isHapticsSupported()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAccent(color);
  };

  const handleApply = async () => {
    if (await isHapticsSupported()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    applyTheme({
      presetId: selectedPreset,
      primary: selectedAccent,
      background: currentPreset.background,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <BlurGradientBackground />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Appearance</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Choose a theme that feels like you
          </Text>
        </View>

        {/* ── Live Preview Strip ── */}
        <View
          style={[
            styles.livePreview,
            {
              backgroundColor: currentPreset.background,
              borderColor: selectedAccent + '33',
            },
          ]}
        >
          <View style={styles.livePreviewLeft}>
            <View style={[styles.liveAccentDot, { backgroundColor: selectedAccent }]} />
            <View>
              <Text style={styles.livePreviewLabel}>Live Preview</Text>
              <Text style={[styles.livePreviewAccent, { color: selectedAccent }]}>
                {currentPreset.label} · {selectedAccent.toUpperCase()}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.livePreviewBadge,
              { backgroundColor: selectedAccent + '1a', borderColor: selectedAccent + '40' },
            ]}
          >
            <Ionicons name="color-palette-outline" size={16} color={selectedAccent} />
          </View>
        </View>

        {/* ── Tab Toggle ── */}
        <View style={styles.tabRow}>
          {(['presets', 'custom'] as const).map(tab => (
            <Pressable
              key={tab}
              style={[
                styles.tab,
                { borderColor: 'rgba(255,255,255,0.08)' },
                activeTab === tab && {
                  backgroundColor: selectedAccent + '1a',
                  borderColor: selectedAccent + '66',
                },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? selectedAccent : colors.textMuted },
                ]}
              >
                {tab === 'presets' ? 'Themes' : 'Custom Accent'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Presets Grid ── */}
        {activeTab === 'presets' && (
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
        )}

        {/* ── Custom Accent Picker ── */}
        {activeTab === 'custom' && (
          <View style={styles.section}>
            <SectionHeader title="ACCENT COLOR" textMuted={colors.textMuted} />
            <View
              style={[
                styles.swatchGrid,
                {
                  backgroundColor: colors.backgroundOverlay,
                  borderColor: 'rgba(255,255,255,0.06)',
                },
              ]}
            >
              {ACCENT_COLORS.map(color => (
                <AccentSwatch
                  key={color}
                  color={color}
                  isSelected={selectedAccent === color}
                  onPress={() => handleAccentSelect(color)}
                />
              ))}
            </View>

            {/* Selected color readout */}
            <View style={styles.colorReadout}>
              <View style={[styles.colorReadoutSwatch, { backgroundColor: selectedAccent }]} />
              <Text style={[styles.colorReadoutHex, { color: colors.text }]}>
                {selectedAccent.toUpperCase()}
              </Text>
              <Text style={[styles.colorReadoutLabel, { color: colors.textMuted }]}>
                Current accent
              </Text>
            </View>
          </View>
        )}

        {/* ── Apply Button ── */}
        <Pressable
          style={({ pressed }) => [
            styles.applyButton,
            {
              backgroundColor: selectedAccent,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleApply}
        >
          <Ionicons name="checkmark-circle" size={20} color="#000" style={styles.applyIcon} />
          <Text style={styles.applyText}>Apply Theme</Text>
        </Pressable>

        <BottomSpacing space={50} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 10) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    maxWidth: 780,
    margin: 'auto',
    width: '100%',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
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

  // Live preview
  livePreview: {
    marginHorizontal: 16,
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

  // Tab toggle
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 20,
    marginRight: 20,
    letterSpacing: 0.5,
  },

  // Preset cards
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
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

  // Mini preview inside card
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

  // Preset label
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

  // Swatch grid
  swatchGrid: {
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  swatchOuter: {
    padding: 3,
  },
  swatchRing: {
    borderRadius: 18,
    padding: 2,
  },
  swatchInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Color readout
  colorReadout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginHorizontal: 20,
  },
  colorReadoutSwatch: {
    width: 20,
    height: 20,
    borderRadius: 5,
  },
  colorReadoutHex: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  colorReadoutLabel: {
    fontSize: 13,
  },

  // Apply button
  applyButton: {
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  applyIcon: {
    marginRight: 8,
  },
  applyText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.2,
  },
});

export default ThemeColorScreen;