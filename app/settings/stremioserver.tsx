import ServerConfiguration from '@/components/ServerConfig';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from '@/components/Themed';

const StremioServerScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ServerConfiguration serverName="Stremio" serverType="stremio" defaultUrl="http://192.168.1.10:11470" />
        </SafeAreaView>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
});

export default StremioServerScreen;
