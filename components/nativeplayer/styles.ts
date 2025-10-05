import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    video: {
        width: '100%',
        height: '100%',
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
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
        marginRight: 16,
    },
    titleContainer: {
        flex: 1,
        marginRight: 16,
    },
    titleText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    subtitleText: {
        color: 'rgba(255, 255, 255, 1)',
        fontWeight: 500
    },
    chapterText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        marginTop: 4,
    },
    topRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlButton: {
        padding: 8,
        marginLeft: 12,
    },
    centerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 60,
    },
    skipButton: {
        padding: 20,
        marginHorizontal: 20,
    },
    playButton: {
        padding: 16,
        marginHorizontal: 30,
    },
    disabledButton: {
        opacity: 0.5,
    },
    bottomControls: {
        paddingHorizontal: 40,
        paddingBottom: 40,
        paddingTop: 20,
        height: 100,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressContainerWithMargin: {
        marginBottom: 16,
        paddingVertical: 10,
        marginHorizontal: 20
    },
    progressSlider: {
        width: '100%',
        height: 20,
    },
    bottomRightControls: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    timeText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
        marginHorizontal: 20
    },
    speedText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 12,
    },
    bufferingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 10,
    },
    bufferingText: {
        color: 'white',
        fontSize: 16,
        marginTop: 8,
    },
    contentFitLabelOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -75 }, { translateY: -50 }],
        zIndex: 5
    },
    contentFitLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    contentFitLabelText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
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
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    sliderThumb: {
        backgroundColor: '#007AFF',
        width: 20,
        height: 20,
    },
    settingsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsPanel: {
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        borderRadius: 12,
        padding: 20,
        minWidth: 500,
        maxWidth: '80%',
        maxHeight: '90%',
    },
    settingsContent: {
        maxHeight: '90%',
    },
    settingsTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 20,
    },
    speedOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    speedOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        margin: 4,
    },
    speedOptionSelected: {
        backgroundColor: '#007AFF',
    },
    speedOptionText: {
        color: 'white',
        fontSize: 14,
    },
    speedOptionTextSelected: {
        fontWeight: '600',
    },
    subtitleOptions: {
        marginBottom: 10,
    },
    subtitleOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 6,
        marginBottom: 8,
    },
    subtitleOptionSelected: {
        backgroundColor: '#007AFF',
    },
    subtitleOptionText: {
        color: '#ffffff',
        fontSize: 14,
    },
    audioOptions: {
        marginBottom: 10,
    },
    audioOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 6,
        marginBottom: 8,
    },
    audioOptionSelected: {
        backgroundColor: '#007AFF',
    },
    audioOptionText: {
        color: 'white',
        fontSize: 14,
    },
    persistentBackButton: {
        position: 'absolute',
        top: 20,
        left: 15,
        zIndex: 1000,
    },
    backButtonPersistent: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    backButtonGradient: {
        padding: 8,
        borderRadius: 8,
    },
    subtitleContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    subtitleBackground: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        maxWidth: '90%',
        backgroundColor: 'rgba(16, 16, 16, 0.7)',
    },
    subtitleControlSection: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    subtitleControlLabel: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    fontSizeButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    fontSizeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    fontSizeButtonSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    fontSizeButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    fontSizeButtonTextSelected: {
        color: 'white',
        fontWeight: '600',
    },
    subtitleOpacitySlider: {
        width: '100%',
        height: 40,
    },
    subtitleOptionContent: {
        flex: 1,
        marginRight: 10,
    },
    subtitleSourceText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
        fontStyle: 'italic',
    },
    subtitleLanguageText: {
        fontSize: 12,
        color: '#007AFF',
        marginTop: 2,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 8,
    },
    loadingText: {
        color: 'white',
        fontSize: 14,
        marginLeft: 10,
        fontWeight: '500',
    },
    settingOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    settingOptionSelected: {
        backgroundColor: 'rgba(0,122,255,0.15)',
    },
    settingOptionText: {
        color: 'white',
        fontSize: 15,
        flex: 1,
        marginRight: 10,
    },
});