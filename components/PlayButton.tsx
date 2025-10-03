import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Themed';

const PlayButton = ({ onPress }: { onPress: () => void }) => (
  <Pressable style={styles.button} onPress={onPress}>
    <Ionicons name="play-outline" size={24} color="#fff" style={styles.icon} />
    <Text style={styles.text}>Watch Now</Text>
  </Pressable>
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
    backgroundColor: 'rgba(83, 90, 255, 0.75)',    
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500'
  },
  icon: {
    marginRight: 8,
  }
});

export default PlayButton;