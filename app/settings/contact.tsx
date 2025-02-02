import React from 'react';
import { StyleSheet, Pressable, Linking, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { View, Text, StatusBar } from '@/components/Themed';
import { isHapticsSupported } from '@/utils/platform';

const ContactScreen = () => {
    const contactInfo = [
        {
            type: 'Email',
            value: 'vcmvijay@gmail.com',
            icon: 'mail-outline',
            action: async () => {
                if (isHapticsSupported()) {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                }
                Linking.openURL('mailto:vcmvijay@gmail.com');
            },
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView style={styles.contactList} showsVerticalScrollIndicator={false}>
                {contactInfo.map((item, index) => (
                    <Pressable
                        key={index}
                        style={styles.contactItem}
                        onPress={item.action}
                    >
                        <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={30} color="#535aff" style={styles.icon} />
                        <View style={styles.info}>
                            <Text style={styles.type}>{item.type}</Text>
                            <Text style={styles.value}>{item.value}</Text>
                        </View>
                    </Pressable>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        width: '100%',
        maxWidth: 780,
        margin: 'auto',
        marginTop: 30,       
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
        marginHorizontal: 20,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15
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
