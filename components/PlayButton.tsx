import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from './Themed';
import { NativeButton } from '@/components/native-ui-controls';
import { radius, spacing, typography } from '@/constants/theme';

const PlayButton = ({ onPress }: { onPress: () => void }) => (
  <NativeButton variant="filled" style={styles.button} onPress={onPress} seedColor="#ffffff">
    <Ionicons name="play-outline" size={24} color="#000000" style={styles.icon} />
    <Text style={styles.text}>Watch Now</Text>
  </NativeButton>
);

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.capsule,
    minWidth: 156,
    alignItems: 'center',
    marginVertical: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    ...typography.headline,
    color: '#000000',
  },
  icon: {
    marginRight: 8,
  }
});

export default PlayButton;