import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

const EmbedPlayer = () => {
    const { url } = useLocalSearchParams();

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
                    allow="autoplay; fullscreen" 
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
        <LinearGradient colors={['#111111', '#222222']} start={[0, 0]} end={[1, 0]} style={{ flex: 1 }}>
            <View style={styles.container}>
                {url ? (
                    Platform.OS === "web" ? (
                        <iframe
                            src={url as string}
                            style={{ flex: 1, width: "100%", height: "100%" }}
                            referrerPolicy="no-referrer-when-downgrade"
                            allow="autoplay; fullscreen"
                            frameBorder={0}
                            allowFullScreen
                        />
                    ) : (
                        <WebView
                            originWhitelist={["*"]}
                            source={{ html: iframeHtml }}
                            style={{ flex: 1 }}
                            javaScriptEnabled
                            domStorageEnabled
                            allowUniversalAccessFromFileURLs
                            allowFileAccess
                            startInLoadingState
                        />
                    )
                ) : (
                    <Text>No video URL available.</Text>
                )}
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: 20,
    },
});

export default EmbedPlayer;
