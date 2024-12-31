export function getTorrServerEpisodeFile(files: any[], season: string, episode: string) {
    const paddedSeason = season.padStart(2, '0');
    const paddedEpisode = episode.padStart(2, '0');
    const seasonEpisodePattern = new RegExp(`S${paddedSeason}E${paddedEpisode}`, 'i');
    const altSeasonEpisodePattern = new RegExp(`S${season}E${episode}`, 'i');

    return (
        files.find(file => seasonEpisodePattern.test(getFileNameFromPath(file.path))) ||
        files.find(file => altSeasonEpisodePattern.test(getFileNameFromPath(file.path))) ||
        (Number(episode) >= 0 && Number(episode) < files.length ? files[+episode] : null)
    );
}

export const getStatsOfInfoHash = async (infoHash: string, serverUrl: string) => {
    const endpoint = `${serverUrl}/stream?link=${infoHash}&stat=true`;
    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to call the TorrServer server endpoint.');
        return await response.json();
    } catch (error) {
        console.error('Error calling TorrServer server:', error);
        throw error;
    }
};

export const generateTorrServerPlayerUrl = async (
    infoHash: string,
    serverUrl: string,
    type: string,
    season: string,
    episode: string
) => {
    const data = await getStatsOfInfoHash(infoHash, serverUrl);

    if (!data || !data.file_stats) {
        const url = `${serverUrl}/stream?link=${infoHash}&index=1&play&preload`;
        await sendHeadRequest(url);
        return url;
    }

    let selectedFile: any;
    if (data.file_stats.length === 1) {
        selectedFile = data.file_stats[0];
    } else {
        if (type === 'movie') {
            selectedFile = getLargestFile(data.file_stats);
        } else if (type === 'series') {
            selectedFile = getTorrServerEpisodeFile(data.file_stats, season, episode);
        }
    }

    if (selectedFile) {
        const fileName = getFileNameFromPath(selectedFile.path);
        const url = `${serverUrl}/stream/${fileName}?link=${infoHash}&title=${fileName}&index=${selectedFile.id}&play&preload`;
        await sendHeadRequest(url);
        return url;
    }

    const fallbackUrl = `${serverUrl}/stream?link=${infoHash}&index=1&play&preload`;
    await sendHeadRequest(fallbackUrl);
    return fallbackUrl;
};

export const sendHeadRequest = async (url: string) => {
    try {
        await fetch(url, { method: 'HEAD' });
    } catch (error) {
        console.error('Error calling TorrServer server:', error);
        throw error;
    }
};

const getLargestFile = (files: any[]) =>
    files.reduce((largest, current) => (current.length > largest.length ? current : largest));

const getFileNameFromPath = (path: string) =>
    path.split('/').pop() || '';
