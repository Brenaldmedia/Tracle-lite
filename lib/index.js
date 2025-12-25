const { 
    Antilink, 
    getAntilink, 
    setAntilink, 
    removeAntilink,
    incrementWarningCount,
    resetWarningCount,
    isSudo 
} = require('./antilink');

// Import database with try-catch to handle missing sequelize
let DATABASE;
try {
    const { DATABASE: dbInstance } = require('./database');
    DATABASE = dbInstance;
    console.log('✅ Database module loaded');
} catch (error) {
    console.log('⚠️ Database module not available, using JSON storage only');
    // Create a mock database if needed
    DATABASE = {
        sync: async () => Promise.resolve(),
        authenticate: async () => Promise.resolve(),
        close: async () => Promise.resolve(),
        query: async () => []
    };
}

// Import antibadword functions with try-catch
let antibadwordExports = {};
try {
    const antibadword = require('./antibadword');
    antibadwordExports = {
        setAntiBadword: antibadword.setAntiBadword,
        getAntiBadword: antibadword.getAntiBadword,
        removeAntiBadword: antibadword.removeAntiBadword,
        antibadwordIncrementWarningCount: antibadword.incrementWarningCount,
        antibadwordResetWarningCount: antibadword.resetWarningCount,
        handleAntiBadwordCommand: antibadword.handleAntiBadwordCommand,
        handleBadwordDetection: antibadword.handleBadwordDetection,
        // Add any other exports from antibadword
        ...antibadword
    };
    console.log('✅ Antibadword module loaded');
} catch (error) {
    console.log('⚠️ Antibadword module not available');
    // Provide default antibadword functions
    antibadwordExports = {
        setAntiBadword: async () => false,
        getAntiBadword: async () => null,
        removeAntiBadword: async () => false,
        antibadwordIncrementWarningCount: async () => 0,
        antibadwordResetWarningCount: async () => {},
        handleAntiBadwordCommand: async () => {},
        handleBadwordDetection: async () => {}
    };
}

// Import anticall command
let anticallCommand;
try {
    anticallCommand = require('./anticall');
    console.log('✅ Anticall module loaded');
} catch (error) {
    console.log('⚠️ Anticall module not available');
    anticallCommand = {};
}



try {
    autorecordingCommand = require('./autorecording');
    console.log('✅ Autorecording module loaded');
} catch (error) {
    console.log('⚠️ Autorecording module not available');
    autorecordingCommand = {};
}

// Check if these functions exist, provide defaults if not
let getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson;
let sms, downloadMediaMessage;
let AntiDelete, DeletedText, DeletedMedia;

try {
    const funcs = require('./functions');
    getBuffer = funcs.getBuffer;
    getGroupAdmins = funcs.getGroupAdmins;
    getRandom = funcs.getRandom;
    h2k = funcs.h2k;
    isUrl = funcs.isUrl;
    Json = funcs.Json;
    runtime = funcs.runtime;
    sleep = funcs.sleep;
    fetchJson = funcs.fetchJson;
} catch (error) {
    console.log('⚠️ Functions module not available, using defaults');
    // Provide default implementations
    getBuffer = async () => Buffer.from('');
    getGroupAdmins = async () => [];
    getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    h2k = (num) => num.toString();
    isUrl = (str) => str.includes('http');
    Json = { parse: JSON.parse, stringify: JSON.stringify };
    runtime = () => '0s';
    sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    fetchJson = async () => ({});
}

try {
    const msgFuncs = require('./msg');
    sms = msgFuncs.sms;
    downloadMediaMessage = msgFuncs.downloadMediaMessage;
} catch (error) {
    console.log('⚠️ Message functions not available, using defaults');
    sms = () => {};
    downloadMediaMessage = async () => Buffer.from('');
}

try {
    const antiDelete = require('./antidelete');
    AntiDelete = antiDelete.AntiDelete;
    DeletedText = antiDelete.DeletedText;
    DeletedMedia = antiDelete.DeletedMedia;
} catch (error) {
    console.log('⚠️ AntiDelete module not available');
    AntiDelete = () => {};
    DeletedText = '';
    DeletedMedia = '';
}

// Combine all exports
module.exports = {
    // Antilink exports
    Antilink,
    getAntilink,
    setAntilink,
    removeAntilink,
    incrementWarningCount,
    resetWarningCount,
    isSudo,
    
    // Antibadword exports
    setAntiBadword: antibadwordExports.setAntiBadword,
    getAntiBadword: antibadwordExports.getAntiBadword,
    removeAntiBadword: antibadwordExports.removeAntiBadword,
    antibadwordIncrementWarningCount: antibadwordExports.antibadwordIncrementWarningCount,
    antibadwordResetWarningCount: antibadwordExports.antibadwordResetWarningCount,
    handleAntiBadwordCommand: antibadwordExports.handleAntiBadwordCommand,
    handleBadwordDetection: antibadwordExports.handleBadwordDetection,
    
    // Anticall exports
    anticallCommand,
    
    // Other exports with fallbacks
    DeletedText,
    DeletedMedia,
    AntiDelete,
    
    // Functions exports
    getBuffer,
    getGroupAdmins,
    getRandom,
    h2k,
    isUrl,
    Json,
    runtime,
    sleep,
    fetchJson,
    
    // Database export (always available)
    DATABASE,
    
    // Message exports
    sms,
    downloadMediaMessage,
    
    // Spread any other antibadword exports (if you want everything)
    ...antibadwordExports
};