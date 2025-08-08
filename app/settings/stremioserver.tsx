import ServerConfiguration from '@/components/ServerConfig';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from '@/components/Themed';

const StremioServerScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ServerConfiguration
                serverName="Stremio"
                serverType="stremio"
                defaultUrl="http://127.0.0.1:11470"
            />
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

export default StremioServerScreen;