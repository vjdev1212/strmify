
const baseUrl = 'https://api.stremio.com';

async function getStreamUrl(infoHash: string): Promise<string> {
    try {
        const response = await fetch(`${baseUrl}/stream/${infoHash}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (data && data.streamUrl) {
            return data.streamUrl;
        } else {
            throw new Error('Stream URL not found in response');
        }
    } catch (error: any) {
        throw new Error(`Failed to fetch stream URL: ${error.message}`);
    }
}
