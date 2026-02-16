// wrapper.js - Place this in nodejs-assets/nodejs-project/
// This wraps your bundled server.js and adds React Native communication

// Import the React Native bridge
var rn_bridge = require('rn-bridge');

// Notify React Native when server starts
rn_bridge.channel.on('message', function(msg) {
  console.log('Received from React Native:', JSON.stringify(msg));
  
  // Echo back for testing
  rn_bridge.channel.send({
    type: 'RESPONSE',
    original: msg,
    timestamp: new Date().toISOString()
  });
});

// Capture console.log to send to React Native
var originalLog = console.log;
console.log = function() {
  originalLog.apply(console, arguments);
  try {
    rn_bridge.channel.send({
      type: 'LOG',
      message: Array.from(arguments).join(' '),
      level: 'info'
    });
  } catch (e) {
    originalLog('Error sending log to RN:', e);
  }
};

// Capture console.error
var originalError = console.error;
console.error = function() {
  originalError.apply(console, arguments);
  try {
    rn_bridge.channel.send({
      type: 'LOG',
      message: Array.from(arguments).join(' '),
      level: 'error'
    });
  } catch (e) {
    originalError('Error sending error to RN:', e);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', function(err) {
  console.error('Uncaught Exception:', err.message);
  rn_bridge.channel.send({
    type: 'ERROR',
    error: err.message,
    stack: err.stack
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', function(reason, promise) {
  console.error('Unhandled Rejection:', reason);
  rn_bridge.channel.send({
    type: 'ERROR',
    error: String(reason)
  });
});

// Now load your bundled server
console.log('Loading bundled server.js...');

try {
  // Require your bundled server
  require('./server.js');
  
  // If the server starts successfully, notify React Native
  // You might need to modify this based on what your server exports
  setTimeout(function() {
    rn_bridge.channel.send({
      type: 'SERVER_STARTED',
      port: process.env.PORT || 3000, // Adjust based on your server's port
      message: 'Server loaded successfully'
    });
  }, 1000);
  
} catch (error) {
  console.error('Failed to load server:', error);
  rn_bridge.channel.send({
    type: 'ERROR',
    error: 'Failed to load server: ' + error.message
  });
}

console.log('Wrapper initialization complete');