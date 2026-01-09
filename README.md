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

<p align="center">
  <img src="https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/strmify-screenshots/iPhone/1-Home%20Screen.png" width="18%" />
  <img src="https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/strmify-screenshots/iPhone/2-Movie-Details.png" width="18%" />
  <img src="https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/strmify-screenshots/iPhone/3-TV-Details.png" width="18%" />
  <img src="https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/strmify-screenshots/iPhone/4-Search.png" width="18%" />
  <img src="https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/strmify-screenshots/iPhone/5-Carousel.png" width="18%" />  
</p>

### Tablet

<p align="center">
  <img src="https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/Strmify-screenshots/iPad%20Air/1-HomeScreen.png" width="18%" />
  <img src="https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/Strmify-screenshots/iPad%20Air/2-Movie-Details.png" width="18%" />
  <img src="https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/Strmify-screenshots/iPad%20Air/3-TV-Details.png" width="18%" />
  <img src="https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/Strmify-screenshots/iPad%20Air/4-Search.png" width="18%" />
</p>

---

## FAQ

### General Questions

**Q: Will it replace Stremio?**  
A: The short answer is NO and it will never be. Stremio provides more features and it's evolving. It has multiple platforms support while strmify is just a simple streaming app powered by stremio addons only for Android and IOS platforms. 

**Q: Why Strmify over Stremio?**  
A: It started as an hobby project when Stremio was not released for IOS so long. Now they have an official Stremio Lite app published in App Store. I want to keep this project as simple with minimal features. The Goal is to focus on the actual streaming rather than loading more features.

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


