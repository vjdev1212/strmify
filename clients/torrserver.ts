export function getTorrServerEpisodeFile(files: any[], season: string, episode: string) {
    const seasonEpisodePattern = new RegExp(`S${season.padStart(2, '0')}E${episode.padStart(2, '0')}`, 'i');
    const altSeasonEpisodePattern = new RegExp(`S${season}E${episode}`, 'i');

    let matchingFile = files.find(file => seasonEpisodePattern.test(getFileNameFromPath(file.path)));
    if (matchingFile) {
        return matchingFile;
    }

    matchingFile = files.find(file => altSeasonEpisodePattern.test(getFileNameFromPath(file.path)));
    if (matchingFile) {
        return matchingFile;
    }

    const episodeIndex = +episode;
    if (episodeIndex >= 0 && episodeIndex < files.length) {
        return files[episodeIndex];
    }

    return null;
}


export const getStatsOfInfoHash = async (infoHash: string, serverUrl: string) => {
    try {
        const response = await fetch(`${serverUrl}/stream?link=${infoHash}&stat=true`);

        if (!response.ok) {
            throw new Error('Failed to call the TorrServer server endpoint.');
        }

        return response.json();
    } catch (error) {
        console.error('Error calling Stremio server:', error);
        throw error;
    }
};

export const generateTorrServerPlayerUrl = async (
    infoHash: string,
    serverUrl: string,
    metaData: any,
    type: string,
    season: string,
    episode: string
) => {
    let index = 1;
    const poster = metaData.poster;
    const title = metaData.name || metaData.title;
    const category = type === 'series' ? 'tv' : type;
    const data = await getStatsOfInfoHash(serverUrl, infoHash);
    let fileName = null;
    if (data) {
        if (data.file_stats.length === 1) {
            const file = data.file_stats[0];
            fileName = getFileNameFromPath(file.path);
            index = file.id;
        }
        else {
            if (type === 'movie') {
                const file = getLargestFile(data.file_stats);
                fileName = getFileNameFromPath(file.path);
                index = file.id;
            }
            else if (type === 'series') {
                const file = getTorrServerEpisodeFile(data.file_stats, season, episode)
                if (file) {
                    fileName = getFileNameFromPath(file.path);
                    index = file.id;
                }
            }
        }
    }
    if (fileName) {
        return `${serverUrl}/stream/${fileName}?link=${infoHash}&index=${index}&play`;
    } else {
        return `${serverUrl}/stream?link=${infoHash}&index=${index}`;
    }
};

const getLargestFile = (files: any) => files.reduce((largest: any, current: any) =>
    current.length > largest.length ? current : largest
);

const getFileNameFromPath = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
};