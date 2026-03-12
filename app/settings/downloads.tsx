import BottomSpacing from '@/components/BottomSpacing';
import { StatusBar, View, Text } from '@/components/Themed';
import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Linking,
  Dimensions,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
const { width } = Dimensions.get('window');

const AppResourcesScreen = () => {
  const resources = [
    {
      id: 1,
      title: 'Google Play Store',
      subtitle: 'Download for Android Devices',
      icon: '📱',
      url: 'https://play.google.com/store/apps/details?id=com.vijayyuvi.strmify',
    },
    {
      id: 2,
      title: 'Manual IPA Install',
      subtitle: 'Direct download for sideloading',
      icon: '🍎',
      url: 'https://github.com/vjdev1212/strmify/releases',
    },
    {
      id: 3,
      title: 'SideStore Source',
      subtitle: 'One-click install via SideStore',
      icon: '📦',
      url: 'sidestore://source?url=https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/sources/sidestore-source.json',
    },
    {
      id: 4,
      title: 'AltStore Source',
      subtitle: 'One-click install via AltStore',
      icon: '🔄',
      url: 'altstore://source?url=https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/sources/sidestore-source.json',
    },
  ];

  const handlePress = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Error opening URL:", error);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Downloads</Text>
          <Text style={styles.subtitle}>Choose your preferred platform</Text>
        </View>

        <View style={styles.resourcesContainer}>
          {resources.map((resource, index) => (
            <TouchableOpacity
              key={resource.id}
              style={[styles.resourceCard,]}
              onPress={() => handlePress(resource.url)}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconContainer]}>
                  <Text style={styles.icon}>{resource.icon}</Text>
                </View>

                <View style={styles.textContainer}>
                  <Text style={styles.resourceTitle}>{resource.title}</Text>
                  <Text style={styles.resourceSubtitle}>{resource.subtitle}</Text>
                </View>

                <View style={styles.arrowContainer}>
                  <View style={styles.arrowButton}>
                    <Text style={styles.arrow}>→</Text>
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
    margin: 'auto',
    marginTop: 30
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textDim,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22
  },
  resourcesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 20,
  },
  resourceCard: {
    backgroundColor: Colors.primarySurface,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
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
    marginRight: 15
  },
  icon: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 6,
  },
  resourceSubtitle: {
    fontSize: 15,
    color: Colors.textDim,
    fontWeight: '400',
    lineHeight: 20,
    paddingRight: 5
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primarySurface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  arrow: {
    fontSize: 20,
    color: Colors.text,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerDivider: {
    width: 60,
    height: 1,
    backgroundColor: Colors.primaryBorder,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 16,
    color: Colors.textDim,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 14,
    color: Colors.textDim,
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default AppResourcesScreen;