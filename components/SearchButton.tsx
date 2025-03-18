import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchButton = ({ onPress, text }: { onPress: () => void, text: string }) => (
  <Pressable style={styles.button} onPress={onPress}>
    <Ionicons name="search" size={20} color="#fff" style={styles.icon} />
    <Text style={styles.text}>Search {text}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
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

export default SearchButton;
