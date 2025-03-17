import ServerConfiguration from '@/components/ServerConfig';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';

const StremioServerScreen = () => {
    return (
                <SafeAreaView style={styles.container}>
                <StatusBar />
                <ScrollView showsVerticalScrollIndicator={false}>
                    <ServerConfiguration serverName="Stremio" serverType="stremio" defaultUrl="http://stremio:11470" />
                </ScrollView>
            </SafeAreaView>
        )
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
