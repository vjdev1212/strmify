import * as Haptics from 'expo-haptics';

export const playHaptic = async () => {
    try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
        console.log('Haptics not supported');
    }
}