import BottomSpacing from '@/components/BottomSpacing';
import { StatusBar, View, Text } from '@/components/Themed';
import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Linking,
  Dimensions,
  SafeAreaView,
  ScrollView
} from 'react-native';
import * as Haptics from 'expo-haptics'
import { isHapticsSupported } from '@/utils/platform';

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
      title: 'App Store (IPA)',
      subtitle: 'iOS sideloading installation',
      icon: '🍎',
      url: 'https://github.com/vijaydevstudio/strmify-public/releases',
    },
    // {
    //   id: 3,
    //   title: 'Docker Image',
    //   subtitle: 'Self-hosted container deployment',
    //   icon: '🐳',
    //   url: 'https://hub.docker.com/r/jarvisnexus/strmify',
    // },
  ];

  const handlePress = async (url: any) => {
    try {
      if (isHapticsSupported()) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.log("Can't open URL: " + url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
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
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
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
    backgroundColor: '#101010',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
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
    color: '#ffffff',
    marginBottom: 6,
  },
  resourceSubtitle: {
    fontSize: 15,
    color: '#888888',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  arrow: {
    fontSize: 20,
    color: '#ffffff',
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
    backgroundColor: '#333333',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 14,
    color: '#444444',
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default AppResourcesScreen;