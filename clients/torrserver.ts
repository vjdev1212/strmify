export const generateTorrServerPlayerUrl = async (
    infoHash: string,
    serverUrl: string,
    metaData: any,
    type: string
) => {
    const index = 1;
    if (metaData) {
        const poster = metaData.poster;
        const title = metaData.name || metaData.title;
        const category = type === 'series' ? 'tv' : type;
        return `${serverUrl}/stream?link=${infoHash}&index=${index}&poster=${poster}&title=${title}&category=${category}&play&save`;
    } else {
        return `${serverUrl}/stream?link=${infoHash}&index=${index}&play`;
    }
};
