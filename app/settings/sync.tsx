import ServerConfiguration from '@/components/ServerConfig';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from '@/components/Themed';
import JsonBinConfigScreen from '@/components/JsonBin';


const SyncScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView showsVerticalScrollIndicator={false}>
                <JsonBinConfigScreen />
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

export default SyncScreen;
