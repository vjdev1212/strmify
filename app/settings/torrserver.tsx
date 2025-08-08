import ServerConfiguration from '@/components/ServerConfig';
import { StatusBar } from '@/components/Themed';
import { SafeAreaView, StyleSheet } from 'react-native';

const TorrServerScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ServerConfiguration
                serverName="TorrServer"
                serverType="torrserver"
                defaultUrl="http://127.0.0.1:8090" />
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
