import React from 'react';
import { StyleSheet, Pressable, Linking, SafeAreaView, ScrollView } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { View, Text, StatusBar } from '@/components/Themed';
import { isHapticsSupported } from '@/utils/platform';
import { LinearGradient } from 'expo-linear-gradient';

const ContactScreen = () => {
    const feedbackUrl = 'https://form.jotform.com/250372743622454'
    const contactInfo = [
        {
            type: 'Feedback',
            value: 'Submit your feedback',
            icon: 'form' as 'form',
            action: async () => {
                if (isHapticsSupported()) {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                }
                Linking.openURL(feedbackUrl);
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
                            <AntDesign name={item.icon} size={30} color="#ffffff" style={styles.icon} />
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
        color: '#ffffff',
        paddingTop: 5,
    },
});

export default ContactScreen;
