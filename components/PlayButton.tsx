import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

const PlayButton = ({ onPress }: { onPress: () => void }) => (
  <Pressable style={styles.button} onPress={onPress}>
    <Ionicons name="play" size={16} color="#fff" style={styles.icon} />
    <Text style={styles.text}>Watch Now</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    marginVertical: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#535aff'
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  icon: {
    marginRight: 8,
  }
});

export default PlayButton;
