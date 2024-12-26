import ServerConfiguration from '@/components/ServerConfig';
import { StyleSheet } from 'react-native';
import { StatusBar, View } from '@/components/Themed';

const StremioServerScreen = () => {
    return (
        <View style={styles.container}>
            <StatusBar />
            <ServerConfiguration serverName="Stremio" serverType="stremio" defaultUrl="http://192.168.1.10:11470" />
        </View>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
});

export default StremioServerScreen;
