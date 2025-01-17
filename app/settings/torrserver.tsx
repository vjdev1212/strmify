import ServerConfiguration from '@/components/ServerConfig';
import { StatusBar } from '@/components/Themed';
import { SafeAreaView, StyleSheet } from 'react-native';

const TorrServerScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ServerConfiguration serverName="TorrServer" serverType="torrserver" defaultUrl="http://192.168.1.10:5665" />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default TorrServerScreen;
