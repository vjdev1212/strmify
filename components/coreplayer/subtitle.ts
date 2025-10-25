// SRT Parser Function (unchanged for compatibility)
export const parseSRT = (srtContent: string) => {
    const subtitles = [];
    const blocks = srtContent.trim().split('\n\n');

    for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const index = lines[0].trim();
            const timeString = lines[1].trim();
            const text = lines.slice(2).join('\n').trim();

            const timeMatch = timeString.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);

            if (timeMatch) {
                const startTime = parseSRTTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
                const endTime = parseSRTTime(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);

                subtitles.push({
                    index: parseInt(index),
                    start: startTime,
                    end: endTime,
                    text: cleanSubtitleText(text)
                });
            }
        }
    }

    return subtitles;
};

export const parseSRTTime = (hours: string, minutes: string, seconds: string, milliseconds: string): number => {
    return parseInt(hours) * 3600 +
        parseInt(minutes) * 60 +
        parseInt(seconds) +
        parseInt(milliseconds) / 1000;
};

export const cleanSubtitleText = (text: string): string => {
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/\{[^}]*\}/g, '')
        .replace(/\\N/g, '\n')
        .replace(/\\h/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\n\s+/g, '\n')
        .trim();
};

export const parseWebVTT = (vttContent: string) => {
    const lines = vttContent.split('\n');
    const subtitles = [];
    let currentSubtitle = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.includes('-->')) {
            const [start, end] = line.split('-->').map(t => t.trim());
            currentSubtitle = {
                start: parseVTTTime(start),
                end: parseVTTTime(end),
                text: ''
            };
        } else if (line && currentSubtitle && !line.startsWith('NOTE') && !line.startsWith('WEBVTT')) {
            if (currentSubtitle.text) {
                currentSubtitle.text += '\n' + line;
            } else {
                currentSubtitle.text = line;
            }
        } else if (!line && currentSubtitle) {
            currentSubtitle.text = cleanSubtitleText(currentSubtitle.text);
            subtitles.push(currentSubtitle);
            currentSubtitle = null;
        }
    }

    if (currentSubtitle) {
        currentSubtitle.text = cleanSubtitleText(currentSubtitle.text);
        subtitles.push(currentSubtitle);
    }

    return subtitles;
};

export const parseVTTTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
    } else if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return parseInt(minutes) * 60 + parseFloat(seconds);
    }
    return 0;
};

export const parseSubtitleFile = (content: string) => {
    const trimmedContent = content.trim();

    if (trimmedContent.startsWith('WEBVTT')) {
        console.log('Detected WebVTT format');
        return parseWebVTT(content);
    }

    if (trimmedContent.includes('-->') && trimmedContent.includes(',')) {
        console.log('Detected SRT format');
        return parseSRT(content);
    }

    console.log('Defaulting to SRT format');
    return parseSRT(content);
};
