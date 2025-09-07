import { getOriginalPlatform } from "./platform";

export enum Players {
    Default = 'Default',
    Browser = 'Browser',
    VLC = 'VLC',
    Infuse = 'Infuse',
    VidHub = 'VidHub',
    MXPlayer = "MX Player",
    MXPlayerPro = "MX PRO",
    OutPlayer = 'OutPlayer'
}

export const getPlatformSpecificPlayers = () => {
    if (getOriginalPlatform() === 'android') {
        return [
            { name: Players.Default, scheme: 'STREAMURL', encodeUrl: false },
            { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false },
            { name: Players.VLC, scheme: 'vlc://STREAMURL', encodeUrl: false },
            { name: Players.MXPlayer, scheme: 'intent:STREAMURL?sign=Yva5dQp8cFQpVAMUh1QxNWbZAZ2h05lYQ4qAxqf717w=:0#Intent;package=com.mxtech.videoplayer.ad;S.title=STREAMTITLE;end', encodeUrl: false },
            { name: Players.MXPlayerPro, scheme: 'intent:STREAMURL?sign=Yva5dQp8cFQpVAMUh1QxNWbZAZ2h05lYQ4qAxqf717w=:0#Intent;package=com.mxtech.videoplayer.pro;S.title=STREAMTITLE;end', encodeUrl: false },
            { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=STREAMURL', encodeUrl: true },
        ];
    } else if (getOriginalPlatform() === 'ios') {
        return [
            { name: Players.Default, scheme: 'STREAMURL', encodeUrl: false },
            { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false },
            { name: Players.VLC, scheme: 'vlc://STREAMURL', encodeUrl: false },
            { name: Players.Infuse, scheme: 'infuse://x-callback-url/play?url=STREAMURL', encodeUrl: true },
            { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=STREAMURL', encodeUrl: true },
            { name: Players.OutPlayer, scheme: 'outplayer://STREAMURL', encodeUrl: false },
        ];
    } else if (getOriginalPlatform() === 'web') {
        return [
            { name: Players.Default, scheme: 'STREAMURL', encodeUrl: false },
            { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false }
        ];
    } else if (getOriginalPlatform() === 'windows') {
        return [
            { name: Players.Default, scheme: 'STREAMURL', encodeUrl: false },
            { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false },
        ];
    } else if (getOriginalPlatform() === 'macos') {
        return [
            { name: Players.Default, scheme: 'STREAMURL', encodeUrl: false },
            { name: Players.Browser, scheme: 'STREAMURL', encodeUrl: false },
            { name: Players.VLC, scheme: 'vlc://STREAMURL', encodeUrl: false },
            { name: Players.Infuse, scheme: 'infuse://x-callback-url/play?url=STREAMURL', encodeUrl: true },
            { name: Players.VidHub, scheme: 'open-vidhub://x-callback-url/open?url=STREAMURL', encodeUrl: true },
        ];
    }
    return [];
};
