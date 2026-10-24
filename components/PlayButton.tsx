import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from './Themed';
import { NativeButton } from '@/components/native-ui-controls';

const PlayButton = ({ onPress }: { onPress: () => void }) => (
  <NativeButton variant="filled" style={styles.button} onPress={onPress} seedColor="#ffffff">
    <Ionicons name="play-outline" size={24} color="#000000" style={styles.icon} />
    <Text style={styles.text}>Watch Now</Text>
  </NativeButton>
);

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 150,
    alignItems: 'center',
    marginVertical: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#ffffff',    
  },
  text: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500'
  },
  icon: {
    marginRight: 8,
  }
});

export default PlayButton;