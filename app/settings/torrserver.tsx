import ServerConfiguration from '@/components/ServerConfig';
import { StatusBar } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

const TorrServerScreen = () => {
    return (
        <LinearGradient colors={['#111111', '#222222']} start={[0, 0]} end={[1, 0]} style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <StatusBar />
                <ScrollView showsVerticalScrollIndicator={false}>
                    <ServerConfiguration serverName="TorrServer" serverType="torrserver" defaultUrl="http://torrserver:5665" />
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
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
