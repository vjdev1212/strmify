import ServerConfiguration from '@/components/ServerConfig';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';

const StremioServerScreen = () => {
    return (
        <LinearGradient colors={['#111111', '#999999', '#222222']} start={[0, 0]} end={[1, 1]} style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <StatusBar />
                <ScrollView showsVerticalScrollIndicator={false}>
                    <ServerConfiguration serverName="Stremio" serverType="stremio" defaultUrl="http://stremio:11470" />
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
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
