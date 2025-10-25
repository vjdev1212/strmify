import {
    StyleSheet,
} from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        padding: 40,
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
    controlsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
        zIndex: 100,
    },
    topControls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    topControlsContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        pointerEvents: 'box-none',
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
    topRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
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
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 20,
        height: 100,
        marginHorizontal: 20
    },
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
        height: 20
    },
    timeText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
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
        fontWeight: '500'
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
    errorBackButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        padding: 8,
        zIndex: 1,
    },
    subtitleContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 5,
    },
    subtitleText: {
        color: '#fff',
        fontWeight: 500,
        textAlign: 'center',
        backgroundColor: 'rgba(16, 16, 16, 0.6)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 8,
        maxWidth: '90%',
        margin: 'auto'
    },    
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
});
