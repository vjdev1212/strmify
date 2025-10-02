import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    videoWrapper: {
        width: '100%',
        height: '100%',
    },
    video: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
    },
    touchArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    controlsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
    },
    topControls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
    },
    backButton: {
        padding: 8,
        marginRight: 12,
    },
    titleContainer: {
        flex: 1,
        marginRight: 12,
    },
    titleText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    topRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    controlButton: {
        padding: 10,
    },
    centerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32,
    },
    skipButton: {
        padding: 8,
    },
    skipButtonInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center'
    },
    playButton: {
        padding: 8,
    },
    playButtonInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center'
    },
    disabledButton: {
        opacity: 0.4,
    },
    bottomControls: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 16,
    },
    progressContainerWithMargin: {
        marginBottom: 12,
        marginHorizontal: 20
    },
    progressSlider: {
        width: '100%',
        height: 10,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20
    },
    rightTimeControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timeText: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 13,
        fontWeight: '500',
        fontVariant: ['tabular-nums'],
    },
    speedText: {
        color: '#535aff',
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: 'rgba(83, 90, 255, 0.15)',
        borderRadius: 6,
    },
    bufferingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    bufferingText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        marginTop: 12,
        fontWeight: '500',
    },
    artworkContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    artworkImage: {
        width: '100%',
        height: '100%',
    },
    artworkOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
    },
    settingsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsPanel: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 24,
        minWidth: 320,
        maxWidth: '85%',
        maxHeight: '75%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    settingsContent: {
        maxHeight: 450,
    },
    settingsTitle: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 16,
        letterSpacing: 0.3,
    },
    optionGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    option: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    optionSelected: {
        backgroundColor: 'rgba(83, 90, 255, 0.2)',
        borderColor: '#535aff',
    },
    optionText: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 14,
        fontWeight: '500',
    },
    optionTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    subtitleOptionsGroup: {
        gap: 8,
        marginBottom: 8,
    },
    subtitleOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    subtitleOptionSelected: {
        backgroundColor: 'rgba(83, 90, 255, 0.2)',
        borderColor: '#535aff',
    },
    subtitleOptionText: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 14,
        fontWeight: '500',
    },
    subtitleOptionTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
});