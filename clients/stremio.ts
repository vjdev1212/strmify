export interface TorrentFile {
  id: number;
  name: string;
  length: number;
}

export class StreamingServerClient {
  private baseURL: string;

  constructor(streamingServerURL: string = 'http://127.0.0.1:11470') {
    this.baseURL = streamingServerURL.replace(/\/$/, '');
  }

  async getStreamingURL(infoHash: string, fileIdx: number = -1): Promise<string> {
    const directURL = `${this.baseURL}/${encodeURIComponent(infoHash)}/${fileIdx}`;
    console.log('Direct streaming URL:', directURL);
    return directURL;
  }

  async getTorrentFiles(infoHash: string): Promise<TorrentFile[]> {
    const url = `${this.baseURL}/${encodeURIComponent(infoHash)}/create`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch torrent info: ${response.status}`);
    const data = await response.json();

    const rawFiles: { name: string; length: number }[] = data.files ?? [];
    return rawFiles.map((f, index) => ({
      id: index,
      name: f.name,
      length: f.length,
    }));
  }
}