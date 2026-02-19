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
}