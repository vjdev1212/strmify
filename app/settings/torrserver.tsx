import ServerConfiguration from '@/components/ServerConfig';
import { StatusBar } from '@/components/Themed';

import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

const TorrServerScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView showsVerticalScrollIndicator={false}>
                <ServerConfiguration serverName="TorrServer" serverType="torrserver" defaultUrl="http://torrserver:5665" />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 30,
        width: '100%',
        maxWidth: 780,
        margin: 'auto'
    },
});

export default TorrServerScreen;
