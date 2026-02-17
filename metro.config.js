// Polyfill Array.prototype.toReversed for Node 18 compatibility.
// metro-config uses toReversed() which was added in Node 20.
// This polyfill must be at the top of this file, before any require().
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () {
    return [...this].reverse();
  };
}

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;