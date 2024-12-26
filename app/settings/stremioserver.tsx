import ServerConfig from '@/components/ServerConfig';

const StremioServerScreen = () => {
    return <ServerConfig serverName="Stremio" serverType="stremio" defaultUrl="http://192.168.1.10:11470" />;
};

export default StremioServerScreen;
