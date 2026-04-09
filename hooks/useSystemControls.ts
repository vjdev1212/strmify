import { useState, useCallback } from 'react';

export const useSystemControls = (videoRef: React.RefObject<any>) => {
    const [brightness, setBrightnessState] = useState(0.5);
    const [volume, setVolumeState] = useState(0.5);

    const setBrightness = useCallback((value: number) => {
        setBrightnessState(value);
        videoRef.current?.setBrightness(value);
    }, [videoRef]);

    const setVolume = useCallback((value: number) => {
        setVolumeState(value);
        videoRef.current?.setVolume(value);
    }, [videoRef]);

    // Call this from your onLoad handler to sync initial values
    const initFromLoad = useCallback((brightness: number, volume: number) => {
        setBrightnessState(brightness);
        setVolumeState(volume);
    }, []);

    return { brightness, volume, setBrightness, setVolume, initFromLoad };
};