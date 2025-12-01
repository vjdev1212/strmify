import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    // Container
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },

    // Video
    video: {
        width: '100%',
        height: '100%',
    },

    // Touch Area
    touchArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    // Controls Overlay
    controlsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
        zIndex: 100,
    },

    // Top Controls
    topControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 20,
        paddingHorizontal: '3%',
        paddingBottom: 20,
        zIndex: 100
    },

    backButton: {
        padding: 8,
        marginRight: 8,
    },

    titleContainer: {
        flex: 1,
        marginRight: 8,
    },

    titleText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 500,
    },

    topRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10
    },

    controlButton: {
        padding: 8,
        marginLeft: 12,
    },

    // Center Controls
    centerControls: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        transform: [{ translateY: -40 }],
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100
    },

    skipButton: {
        padding: 20,
        marginHorizontal: 20,
    },

    playButton: {
        paddingHorizontal: 16,
        marginHorizontal: 30,
    },

    disabledButton: {
        opacity: 0.5,
    },

    // Bottom Controls
    bottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,        
        paddingTop: 20,
        height: 100,
        marginHorizontal: '3%',
        zIndex: 100,
    },

    // Progress Bar
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    progressContainerWithMargin: {
        marginBottom: 16,
        paddingVertical: 10,
    },

    progressSlider: {
        width: '100%',
        height: 20,
    },
    timeText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 500,
    },

    speedText: {
        color: '#535aff',
        fontSize: 14,
        fontWeight: 500,
        marginLeft: 12,
    },

    // Buffering
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
        fontWeight: 500,
    },

    // Content Fit Label
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

    // Artwork Background
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
        opacity: 0.7
    },

    artworkOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    },

    artworkLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },

    backButtonGradient: {
        padding: 8,
        borderRadius: 8,
    },

    loadingBackButtonContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 20,
        paddingHorizontal: 20,
        zIndex: 1000,
        flexDirection: "row",
        alignItems: "center",
    },

    // Subtitle Display
    subtitleContainer: {
        position: 'absolute',
        bottom: 18,
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 5,
    },

    subtitleBackground: {
        maxWidth: '90%',
        borderRadius: 8,
        overflow: 'hidden',
    },

    blurView: {
        borderRadius: 8,
        overflow: 'hidden',
    },

    gradientOverlay: {
        paddingHorizontal: 16,
        paddingVertical: 7,
    },

    subtitleText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: 0.05,
        textAlign: 'center',
    },
    // Error Display
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        padding: 20,
    },

    errorTitle: {
        color: '#ff6b6b',
        fontSize: 24,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 12,
        textAlign: 'center',
    },

    errorText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },

    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },

    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },

    errorBackButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        padding: 8,
        zIndex: 1,
    },

    // Seek Feedback (VLC-specific)
    seekFeedback: {
        position: 'absolute',
        top: '40%',
        zIndex: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 12,
        padding: 16,
    },

    seekFeedbackContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    seekFeedbackText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
    },

    // Settings Panel (if needed for web)
    glassOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    glassPanel: {
        backgroundColor: '#1a1a1af2',
        borderRadius: 12,
        padding: 24,
        minWidth: 500,
        maxWidth: '90%',
        maxHeight: '75%',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },

    panelTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },

    settingsContent: {
        maxHeight: 300,
    },

    settingOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(142, 142, 142, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },

    settingOptionSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.2)',
        borderColor: 'rgba(0, 122, 255, 0.4)',
    },

    settingOptionText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 500,
    },

    speedOptionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },

    speedOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 60,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },

    speedOptionSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.3)',
        borderColor: 'rgba(0, 122, 255, 0.5)',
    },

    speedOptionText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 500,
    },

    speedOptionTextSelected: {
        fontWeight: '700',
        color: '#007AFF',
    },

    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        paddingVertical: 8,
    },

    loadingText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        marginLeft: 8,
    },

    noTracksText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 16,
        textAlign: 'center',
        paddingVertical: 20,
    },

    subtitleOptionContent: {
        flex: 1,
    },

    subtitleSourceText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        marginTop: 2,
    },
});