import React from 'react';
import { Modal, ActivityIndicator, StyleSheet, Pressable, TouchableWithoutFeedback } from 'react-native';
import { View, Text } from './Themed';

interface StatusModalProps {
  visible: boolean;
  statusText: string;
  onCancel: () => void;
}

const StatusModal: React.FC<StatusModalProps> = ({ visible, statusText, onCancel }) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ActivityIndicator size="large" color="#535aff" style={styles.activityIndicator} />
            <Text style={styles.modalText}>{statusText}</Text>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)'
  },
  modalContainer: {
    padding: 24,
    borderRadius: 16,
    minWidth: 280,
    maxWidth: 320,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  activityIndicator: {
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    color: '#ffffff',
    lineHeight: 22,
  },
  cancelButton: {
    marginVertical: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120,
    backgroundColor: '#535aff'
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600'
  }
});

export default StatusModal;
