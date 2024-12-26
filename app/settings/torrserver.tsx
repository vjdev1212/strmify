import ServerConfiguration from '@/components/ServerConfig';
import { StatusBar, View } from '@/components/Themed';
import { StyleSheet } from 'react-native';


const TorrServerScreen = () => {
    return (
        <View style={styles.container}>
            <StatusBar />
            <ServerConfiguration serverName="TorrServer" serverType="torrserver" defaultUrl="http://192.168.1.10:5665" />
        </View>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
});

export default TorrServerScreen;
