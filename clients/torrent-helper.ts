

export function getTorrServerEpisodeFile(files: any[], season: string, episode: string) {
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
