import BottomSpacing from '@/components/BottomSpacing';
import { StatusBar, View, Text } from '@/components/Themed';
import React from 'react';
import { TouchableOpacity, StyleSheet, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

const resources = [
  { id: 1, title: 'Google Play Store', subtitle: 'Download for Android Devices', icon: '📱', url: 'https://play.google.com/store/apps/details?id=com.vijayyuvi.strmify' },
  { id: 2, title: 'Manual IPA Install', subtitle: 'Direct download for sideloading', icon: '🍎', url: 'https://github.com/vjdev1212/strmify/releases' },
  { id: 3, title: 'SideStore Source', subtitle: 'One-click install via SideStore', icon: '📦', url: 'sidestore://source?url=https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/sources/sidestore-source.json' },
  { id: 4, title: 'AltStore Source', subtitle: 'One-click install via AltStore', icon: '🔄', url: 'altstore://source?url=https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/sources/sidestore-source.json' },
];

const DownloadsScreen = () => {
  const { colors } = useTheme();
  const handlePress = async (url: string) => { try { await Linking.openURL(url); } catch (error) { console.error("Error opening URL:", error); } };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Downloads</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Choose your preferred platform</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.resourcesContainer}>
          {resources.map((resource) => (
            <TouchableOpacity
              key={resource.id}
              style={[styles.resourceCard, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}
              onPress={() => handlePress(resource.url)}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>{resource.icon}</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.resourceTitle, { color: colors.text }]}>{resource.title}</Text>
                  <Text style={[styles.resourceSubtitle, { color: colors.textMuted }]}>{resource.subtitle}</Text>
                </View>
                <View style={styles.arrowContainer}>
                  <View style={[styles.arrowButton, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}>
                    <Text style={[styles.arrow, { color: colors.text }]}>→</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <BottomSpacing space={50} />
      </ScrollView>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 34,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -1,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'left',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  resourcesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 20,
  },
  resourceCard: {
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 30,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  icon: { fontSize: 28 },
  textContainer: { flex: 1 },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
  },
  resourceSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    paddingRight: 5,
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  arrow: { fontSize: 20, fontWeight: '600' },
});

export default DownloadsScreen;