import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  ViewStyle,
  TextStyle,
  Modal,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AnchorPosition {
  x: number;
  y: number;
}

interface ContextMenuProps {
  visible: boolean;
  onClose?: () => void;
  items?: any[];
  selectedItem?: any;
  onItemSelect?: (item: any) => void;
  anchorPosition?: AnchorPosition;
}

const CustomContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  onClose,
  items = [],
  selectedItem,
  onItemSelect,
  anchorPosition = { x: 0, y: 0 },
}) => {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(-5)).current;

  const menuWidth = 100;
  const itemHeight = 50;
  const maxVisibleItems = 5;
  const maxHeight = maxVisibleItems * itemHeight;
  const menuHeight = Math.min(items.length * itemHeight, maxHeight) + 16;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -5,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const isItemSelected = (item: any): boolean => {
    if (!selectedItem) return false;
    if (typeof selectedItem === 'object' && typeof item === 'object') {
      return selectedItem.id === item.id || selectedItem === item;
    }
    return selectedItem === item;
  };

  const handleItemPress = (item: any): void => {
    onItemSelect?.(item);
    onClose?.();
  };

  const renderDefaultItem = (item: any): React.ReactNode => {
    const displayText = typeof item === 'string' ? item : 
                      item.label || item.title || item.name || 
                      JSON.stringify(item);
    
    const subtitle = item.subtitle || item.description || item.secondary;
    
    return (
      <View style={styles.defaultItemContent}>
        <Text
          style={[
            styles.itemText,
            isItemSelected(item) && styles.selectedText,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.itemSubtitle,
              isItemSelected(item) && styles.selectedSubtitle,
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.contextMenu,
              {
                left: anchorPosition.x,
                top: anchorPosition.y,
                width: menuWidth,
                maxHeight: menuHeight,
                transform: [
                  { scale: scaleAnim },
                  { translateY: slideAnim },
                ],
              },
            ]}
          >
            <ScrollView
              style={[styles.menuScrollView, { maxHeight: maxHeight }]}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item, index) => (
                <TouchableOpacity
                  key={item.id || index.toString()}
                  style={[
                    styles.menuItem,
                    isItemSelected(item) && styles.selectedItem,
                  ]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.9}
                >
                  <View style={styles.itemContent}>
                    {renderDefaultItem(item)}
                  </View>
                  
                  {isItemSelected(item) && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  } as ViewStyle,
  contextMenu: {
    position: 'absolute',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  } as ViewStyle,
  menuScrollView: {
    flexGrow: 0,
  } as ViewStyle,
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  } as ViewStyle,
  selectedItem: {
    backgroundColor: '#535aff26',
  } as ViewStyle,
  itemContent: {
    flex: 1,
  } as ViewStyle,
  defaultItemContent: {
    flex: 1,
  } as ViewStyle,
  itemText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '400',
  } as TextStyle,
  selectedText: {
    color: '#535aff',
    fontWeight: '600',
  } as TextStyle,
  itemSubtitle: {
    fontSize: 13,
    color: '#cccccc',
    marginTop: 2,
  } as TextStyle,
  selectedSubtitle: {
    color: '#a0a4ff',
  } as TextStyle,
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#535aff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  } as ViewStyle,
  checkmarkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  } as TextStyle,
});

export default CustomContextMenu;