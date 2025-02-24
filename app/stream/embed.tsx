import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Iframe } from "@bounceapp/iframe"
import { movieUrlTemplate, seriesUrlTemplate } from '@/constants/Embed';

const EmbedPlayer = () => {
    const { url } = useLocalSearchParams();

    // HTML structure with iframe and popup-blocking JavaScript
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
                        height: 95vh;
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
                    sandbox="allow-forms allow-scripts allow-same-origin allowfullscreen"
                    allowfullscreen>
                </iframe>
            </div>

            <script>
                // Block popups by overriding window.open
                window.open = function() { return null; };
            </script>
        </body>
        </html>
    `;

    return (
        <View style={styles.container}>
            {url ? (
                Platform.OS === 'web' ? (
                    <Iframe uri={url as string} style={{ flex: 1 }} />
                ) : (
                    <WebView
                        originWhitelist={['*']}
                        source={{ html: iframeHtml }}
                        style={{ flex: 1 }}
                        javaScriptEnabled
                        domStorageEnabled
                        startInLoadingState
                        javaScriptEnabledAndroid
                        allowUniversalAccessFromFileURLs
                        allowFileAccess
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
        paddingBottom: 20
    },
});

export default EmbedPlayer;
