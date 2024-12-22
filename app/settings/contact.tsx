import React from 'react';
import { StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { View, Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics'

const ContactScreen = () => {
    const contactInfo = [
        {
            type: 'Email',
            value: 'vcmvijay@gmail.com',
            icon: 'mail-outline',
            action: async () => {
                if (Platform.OS !== 'web') {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                Linking.openURL('mailto:vcmvijay@gmail.com')
            },
        }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.contactList}>
                {contactInfo.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.contactItem}
                        onPress={item.action}
                    >
                        <Ionicons name={item.icon} size={30} color="#535aff" style={styles.icon} />
                        <View style={styles.info}>
                            <Text style={styles.type}>{item.type}</Text>
                            <Text style={styles.value}>{item.value}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    contactList: {
        flexDirection: 'column',
        marginTop: 10,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'gray',
    },
    icon: {
        marginRight: 15,
    },
    info: {
        flex: 1,
    },
    type: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    value: {
        fontSize: 14,
        color: '#535aff',
        paddingTop: 5,
    },
});

export default ContactScreen;
