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
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Header Section */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <ActivityIndicator size="large" color="#535aff" />
                </View>
                <Text style={styles.title}>Processing</Text>
              </View>

              {/* Content Section */}
              <View style={styles.content}>
                <Text style={styles.modalText}>{statusText}</Text>
                
                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={styles.progressFill} />
                  </View>
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                  <View style={styles.infoDot} />
                  <Text style={styles.infoText}>
                    This may take a moment depending on server response
                  </Text>
                </View>
              </View>

              {/* Action Section */}
              <View style={styles.actionSection}>
                <Pressable 
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.cancelButtonPressed
                  ]} 
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#101010',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 25,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(83, 90, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(83, 90, 255, 0.15)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#cccccc',
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '400',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    backgroundColor: '#535aff',
    borderRadius: 2,
    shadowColor: '#535aff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(83, 90, 255, 0.04)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(83, 90, 255, 0.08)',
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#535aff',
    marginRight: 10,
    opacity: 0.7,
  },
  infoText: {
    fontSize: 13,
    color: '#999',
    flex: 1,
    lineHeight: 18,
    fontWeight: '400',
  },
  actionSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    minHeight: 52,
    justifyContent: 'center',
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    transform: [{ scale: 0.98 }],
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#ff6b6b',
    fontWeight: '600',
    letterSpacing: 0.5,
  }
});

export default StatusModal;