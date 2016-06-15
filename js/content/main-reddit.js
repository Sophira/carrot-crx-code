/**
 *
 * Functionality when on reddit
 *
 * @module main-reddit
 */
import $ from 'jquery';

// don't include logger here
//import logger from '../logger.js';
let logger = {log: function() {}};

import injectChatRoom from './inject-chat.js';
import runSubredditLogic from './subreddit-logic.js';
import frontpageLogic from './reddit__front-page.js';

/**
 *
 * Main script to load when on reddit
 *
 */
export default function mainReddit () {
    $('body').addClass('domain-reddit');
    logger.log('main-reddit', 'Loaded. Preparing to insert embedded chat');

    chrome.runtime.sendMessage({
        messageType: 'log',
        message: 'Reddit loaded, preparing to fetch state from extension'
    });

    /**
     * Run page specific scripts
     */
    // test if we're on the main frontpage
    if (window.location.pathname === '/' || 
    window.location.pathname === '/r/all' ||
    window.location.pathname === '/r/all/') {
        frontpageLogic();
    }
    
    // Run sub-reddit specific logic
    runSubredditLogic();

    // Attempt to inject chatroom for the corresponding subreddit
    injectChatRoom();
}
