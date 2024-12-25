import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

const PlayButton = ({ onPress }: { onPress: () => void }) => (
  <Pressable style={styles.button} onPress={onPress}>
    <Text style={styles.text}>Search Movie</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#535aff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    marginVertical: 20,
    alignSelf: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PlayButton;
