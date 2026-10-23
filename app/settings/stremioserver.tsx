import ServerConfiguration from '@/components/ServerConfig';
import { StatusBar, View } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';

const StremioServerScreen = () => {
    const { colors } = useTheme();
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar />
            <ServerConfiguration
                serverName="Stremio"
                serverType="stremio"
                defaultUrl="http://127.0.0.1:11470"
            />
        </View>
    );
};

export default StremioServerScreen;