import { Text, View } from "@/components/Themed";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

const EmbedPlayer = () => {
    const { url } = useLocalSearchParams();
    const webViewBgColor = '#000';

    const iframeHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Embed Video Player</title>
            <style>
                body {
                    padding: 0 !important;
                    margin: 0 !important;
                    background-color: #000;
                }
                .iframe-container {
                    height: 100vh;
                    width: 100%;
                    margin: auto;
                    border: none;
                }
                @media (orientation: portrait) {
                    .iframe-container {
                        height: 100vh;
                    }
                }
            </style>
        </head>
        <body>
            <div class="iframe-container">
                <iframe 
                    src="${url}" 
                    frameborder="0" 
                    style="width: 100%; height: 100%;"
                    allow="autoplay; fullscreen; encrypted-media"
                    referrerPolicy="no-referrer-when-downgrade"
                    sandbox="allow-forms allow-scripts allow-same-origin allowfullscreen allow-presentation"
                    allowfullscreen>
                </iframe>
            </div>
            <script>
                window.open = function() { return null; };
            </script>
        </body>
        </html>
    `;

    return (
        <View style={styles.container}>
            {url ? (
                Platform.OS === "web" ? (
                    <iframe
                        src={url as string}
                        style={{ flex: 1, width: "100%", height: "100%", border: 0, backgroundColor: '#000000' }}
                        referrerPolicy="no-referrer-when-downgrade"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-presentation"
                        allow="encrypted-media; autoplay; fullscreen; picture-in-picture; web-share"
                        frameBorder="0"
                        allowFullScreen
                        x-webkit-airplay="allow"
                        webkit-playsinline="false"
                    />
                ) : (
                    <WebView
                        originWhitelist={['*']}
                        source={{ html: iframeHtml }}
                        style={{
                            flex: 1,
                            backgroundColor: webViewBgColor,
                            marginTop: 30,
                            marginBottom: 10
                        }}
                        javaScriptEnabled
                        domStorageEnabled
                        startInLoadingState
                        allowUniversalAccessFromFileURLs
                        allowFileAccess
                        mediaPlaybackRequiresUserAction={false}
                        allowsFullscreenVideo={true}
                        allowsAirPlayForMediaPlayback={true}
                        allowsPictureInPictureMediaPlayback={true}
                        allowsInlineMediaPlayback={false}
                        bounces={false}
                    />
                )
            ) : (
                <Text>No video URL available.</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: 20,
    },
});

export default EmbedPlayer;
