import ServerConfiguration from '@/components/ServerConfig';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from '@/components/Themed';

const StremioServerScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView>
                <ServerConfiguration serverName="Stremio" serverType="stremio" defaultUrl="http://127.0.0.1:11470" />
            </ScrollView>
        </SafeAreaView>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 30
    },
});

export default StremioServerScreen;
