# Strmify

Strmify is your streaming companion for discovering and streaming movies and TV shows through various add-on sources and third-party integrations. Find, search, and play content using your preferred media player.

---

## Components

1. **TMDB** – Provides comprehensive metadata that powers the application
2. **Stremio Add-ons** – Essential for streaming content via torrents or direct links
3. **Stremio Service** – Enables seamless remote torrent streaming capabilities
4. **Trakt** – Tracks watch progress and delivers personalised catalogues
5. **Media Players** – Supports a wide variety of playback formats

---

## About Strmify

Strmify is designed to work within the Stremio addons ecosystem but takes a minimalistic approach by using only the essential functionality required for streaming.

### Content Discovery

Instead of relying on addon catalogues, Strmify provides content discovery through:

- **TMDB API** – Powers popular, trending, and genre-specific catalogues.
- **Trakt Integration** – Allows users to create custom watchlists and catalogues, eliminating the need for addon developers to maintain their own catalogue systems.

## Download

[![Get it on Google Play](https://img.shields.io/badge/Google_Play-414141?style=for-the-badge&logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.vijayyuvi.strmify)
[![Install via AltStore](https://img.shields.io/badge/AltStore-4CAF50?style=for-the-badge&logo=apple&logoColor=white)](https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/sources/sidestore-source.json)
[![Install via SideStore](https://img.shields.io/badge/SideStore-A020F0?style=for-the-badge&logo=apple&logoColor=white)](https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/sources/sidestore-source.json)

Or download directly from [GitHub Releases](https://github.com/vjdev1212/strmify/releases)

---

## Screenshots

### Mobile

<p float="left">
  <img src="https://github.com/user-attachments/assets/af0a2a2c-6116-43dc-ba5e-1493bd219e7a" width="19%" />
  <img src="https://github.com/user-attachments/assets/ad4c5370-d9ff-48a9-86c7-ea4c146b67b5" width="19%" />
  <img src="https://github.com/user-attachments/assets/6f6205e3-0b03-4b4b-a75b-900dc0e3f27b" width="19%" />
  <img src="https://github.com/user-attachments/assets/56bfc73a-de3c-4393-84d6-b67908478ac4" width="19%" />
  <img src="https://github.com/user-attachments/assets/0d486463-3ac8-49f9-af8e-834a24a125b7" width="19%" />
</p>

### Tablet

<p align="center">
  <img src="https://github.com/user-attachments/assets/17e0a24b-7355-4da1-8eaf-5810bf7f9d19" width="49%" />
  <img src="https://github.com/user-attachments/assets/167bd238-ab33-435e-9b28-b83f9e801523" width="49%" />
  <img src="https://github.com/user-attachments/assets/235c6021-60cc-486d-93bd-5d45f5b72035" width="49%" />
  <img src="https://github.com/user-attachments/assets/e21b35cb-e110-4d5a-9d8c-de6986eea191" width="49%" />
</p>

---

## FAQ

### General Questions

**Q: Will the app continue to be maintained and updated?**  
A: I will maintain this app as long as time permits. Updates may not be frequent, but the app will continue to receive steady maintenance and improvements over time.

**Q: Will there be a TV version of the app?**  
A: No, there are no plans to build a TV version. There are already good apps available for TV platforms.

### Privacy & Data

**Q: Does this app collect any data?**  
A: No, the app does not collect any data. There isn't even a signup page.

**Q: What about Trakt authentication details?**  
A: Your Trakt authentication details are stored locally on your device and will be cleared during uninstall. This data is not sent to any remote servers or logged by the application.

### Content

**Q: Will this project support Anime content?**  
A: No, there are no plans to support anime content. Please feel free to use other apps for that purpose.

---

## For Developers: Addon Documentation

### Overview

Strmify addons provide streaming sources for movies and series through a standardized API. Addons can serve both direct streams and torrent-based streams.

---

### Manifest Endpoint

**URL Pattern:** `{addonurl}/manifest.json`  
**Example:** `https://mediafusion.elfhosted.com/manifest.json`

#### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier for the addon |
| `version` | string | Addon version |
| `name` | string | Display name of the addon |
| `description` | string | Brief description of the addon |
| `types` | array | Supported content types: `["movie", "series"]` |

#### Optional Properties

| Property | Type | Description |
|----------|------|-------------|
| `logo` | string | URL to addon logo image |
| `behaviorHints.configurable` | boolean | Whether addon supports configuration |

#### Example Response
```json
{
  "id": "com.stremio.mediafusion",
  "version": "1.0.0",
  "name": "MediaFusion",
  "description": "Universal Stremio Add-on for Movies, Series.",
  "types": ["movie", "series"],
  "behaviorHints": {
    "configurable": true
  },
  "logo": "https://i.ibb.co/8DVXvP3/icon-152x152.png"
}
```

---

### Stream Endpoint

**URL Pattern:** `{addonurl}/stream/<type>/<imdbid>.json`  
**Example:** `https://mediafusion.elfhosted.com/stream/movie/tt6105098.json`

#### Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `<type>` | Content type | `movie` or `series` |
| `<imdbid>` | IMDb ID | `tt6105098` |

---

### Stream Types

#### 1. Torrent Streams

Torrent streams require the Stremio service to be configured in settings.

**Required Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `infoHash` or `magnet` | string | Either infohash or magnet link (at least one required) |
| `name` | string | Source/quality identifier |
| `title` | string | Detailed stream information |

**Example Response:**
```json
{
  "streams": [
    {
      "name": "Torrentio\n4k HDR",
      "title": "The Lion King 2019.MULTi.UHD.BluRay.2160p.TrueHD.Atmos.7.1.HEVC-DDR\n👤 11 💾 18.79 GB ⚙️ 1337x\nMulti Audio",
      "infoHash": "<infohash>"
    },
    {
      "name": "Torrentio\n4k HDR",
      "title": "The Lion King 2019 4K UHD BluRay 2160p HDR10 DTS-HD MA TrueHD 7.1 Atmos x265-MgB\n👤 8 💾 20.63 GB ⚙️ 1337x",
      "magnet": "<magnetLink>"
    }
  ]
}
```

---

#### 2. Direct Streams

Direct HTTP/HTTPS streaming URLs.

**Required Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `url` | string | Direct streaming URL |
| `name` | string | Source/quality identifier |
| `title` or `description` | string | Detailed stream information (title preferred) |

**Example Response:**
```json
{
  "streams": [
    {
      "name": "Torrentio\n4k HDR",
      "title": "The Lion King 2019.MULTi.UHD.BluRay.2160p.TrueHD.Atmos.7.1.HEVC-DDR\n👤 11 💾 18.79 GB ⚙️ 1337x\nMulti Audio",
      "url": "<url>"
    },
    {
      "name": "Torrentio\n4k HDR",
      "title": "The Lion King 2019 4K UHD BluRay 2160p HDR10 DTS-HD MA TrueHD 7.1 Atmos x265-MgB\n👤 8 💾 20.63 GB ⚙️ 1337x",
      "url": "<url>"
    }
  ]
}
```

---

### Important Notes

- **Torrent Streams:** Both `infoHash` and `magnet` are supported. Provide at least one
- **Stremio Service:** Torrent streaming requires the Stremio service to be configured in Strmify settings
- **Stream Format:** Strmify handles both torrent and direct stream formats automatically


## Media Player Compatibility Matrix

The tables below summarise the playback behaviour for Torrent and Direct streams across various player and server configurations.

### Torrent Streams

| Stremio Server | Media Player     | Behavior |
|----------------|-----------------|-------------------|
| **Yes**        | Default  | Stream will be either played directly or Transcoded based on the metadata. |
| **Yes**        | External | Opens the stream in an external player and lets the Media Player do the Transcoding. |
| **No**         | Default  | Cannot proceed. Stremio Server configuration is required. |
| **No**         | External | Cannot proceed. Stremio Server configuration is required. |


### Direct Streams

| Stremio Server | Media Player     | Behavior |
|----------------|-----------------|-------------------|
| **No**         | Default  | Attempt direct playback; fallback to VLC if unsupported. |
| **No**         | External | Opens the stream URL directly. |
| **Yes**        | Default  | Ignores Stremio Server. Attempt direct playback; fallback to VLC if unsupported. |
| **Yes**        | External | Ignores Stremio Server. Opens the stream URL directly in an external player. |


