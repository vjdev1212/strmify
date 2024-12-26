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

export const generateStremioPlayerUrl = async (infoHash: string, serverUrl: string) => {
    const data = await processInfoHashWithStremio(infoHash, serverUrl);
    return `${serverUrl}/${infoHash}/${data.guessedFileIdx || 0}`;
};
