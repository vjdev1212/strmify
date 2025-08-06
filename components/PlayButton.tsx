import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Themed';

const PlayButton = ({ onPress }: { onPress: () => void }) => (
  <Pressable style={styles.button} onPress={onPress}>
    <Ionicons name="play" size={18} color="#fff" style={styles.icon} />
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
    backgroundColor: 'rgba(83, 90, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(83, 90, 255, 0.3)',
    backdropFilter: 'blur(10px)',
    shadowColor: '#535aff',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500'
  },
  icon: {
    marginRight: 8,
  }
});

export default PlayButton;