export const processInfoHashWithStremio = async (infoHash: string, serverUrl: string) => {
    try {
        const response = await fetch(`${serverUrl}/${infoHash}/create`, {
            method: 'POST',
            body: JSON.stringify({ torrent: { infoHash }, guessFileIdx: {} }),
        });

        if (!response.ok) {
            throw new Error('Failed to call the Stremio server endpoint.');
        }

        return response.json();
    } catch (error) {
        console.error('Error calling Stremio server:', error);
        throw error;
    }
};

export const generateStremioPlayerUrl = async (infoHash: string, serverUrl: string, type: string, season: string, episode: string) => {
    const data = await processInfoHashWithStremio(infoHash, serverUrl);
    let fileName = '';
    let fileIndex = `${data.guessedFileIdx || 0}`;
    if (data) {
        if (data.files.length === 1) {
            fileName = data.files[0].name;
        }
        else {
            if (type === 'movie') {
                fileName = data.files[fileIndex].name;
            }
            else if (type === 'series') {
                const file = getEpisodeFile(data.files, season, episode)
                if (file) {
                    fileName = file.name;
                }
                else {
                    fileName = fileIndex;
                }
            }
        }
    }
    return `${serverUrl}/${infoHash}/${fileName}`;
};

function getEpisodeFile(files: any[], season: string, episode: string) {
    const seasonEpisodePattern = new RegExp(`S${season.padStart(2, '0')}E${episode.padStart(2, '0')}`, 'i');
    const altSeasonEpisodePattern = new RegExp(`S${season}E${episode}`, 'i');

    let matchingFile = files.find(file => seasonEpisodePattern.test(file.name));
    if (matchingFile) {
        return matchingFile;
    }

    matchingFile = files.find(file => altSeasonEpisodePattern.test(file.name));
    if (matchingFile) {
        return matchingFile;
    }

    const episodeIndex = +episode;
    if (episodeIndex >= 0 && episodeIndex < files.length) {
        return files[episodeIndex];
    }

    return null;
}
