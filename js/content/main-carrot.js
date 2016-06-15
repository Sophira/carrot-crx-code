/**
 *
 * Functionality when on carrot
 *
 * @module main-carrot
 */

/**
 * dependencies
 */
import $ from 'jquery';
import CONFIG from '../config.js';

// don't include logger here
//import logger from '../logger.js';
let logger = {log: function() {}};

/**
 * Functionality
 */
export default function mainCarrot () {
    logger.log('chrome-extension/main-carrot', 'called!');
    $('body').addClass('domain-carrot');

    // Allow carrot to update the notification's unread state behavior
    window.addEventListener('message', function (message) {
        if (typeof message !== 'object') { return false; }
        if (typeof message.data !== 'object') { return false; }

        var data = message.data;

        if (data.messageType === 'carrot:routeChanged') {
            chrome.runtime.sendMessage({
                messageType: 'clearUnreadCountForSlug',
                slug: data.slug
            }, function (){});
        }
    }, false);

    // Add listener so extension popup can change the carrot URL
    chrome.runtime.onMessage.addListener(function gotMessage (message, sender, sendResponse) {
        logger.log('chrome-extension/chrome.onMessage', 'got message: ', message);

        switch (message.messageType) {
            case 'changeLocation':
                var elem = document.createElement('script');
                elem.type = "text/javascript";
                elem.innerHTML = "window._history.push('" + message.location + "')";
                document.head.appendChild(elem);
                break;

            default:
                logger.log('chrome-extension/chrome.onMessage:default',
                'No case handled for ' + message.messageType);

        }
    });

    // If we're on the loading page, add a timeout to reload after a couple seconds
    // to ensure we're not stuck on the loading page (part of the onboarding 
    // extension flow) NOTE: This is deprecated, not used for all new users
    if ((window.location.pathname).replace(/\//g, '').toLowerCase() === 'loading') {
        setTimeout(() => {
            // ensure we're still on loading page (this should always be true)
            if ((window.location.pathname).replace(/\//g, '').toLowerCase() === 'loading') {
                window.location = '/';
            }
        }, 1000 * 90); // after 1.5 minutes, redirect

        var numCalls = 0;

        function checkLoggedInState () {
            chrome.runtime.sendMessage(
                { messageType: 'fetchStoreState' },
                function (data){
                    // if a username and loggedIntoCarrot is true, redirect to
                    // home page
                    numCalls++;

                    if (data.storeState.username) {
                        if ((window.location.pathname).replace(/\//g, '').toLowerCase() === 'loading') {
                            window.location = '/';
                        }
                        clearInterval(checkInterval);

                    } else {
                        chrome.runtime.sendMessage(
                            { messageType: 'fetchAndUpdateNotifications' },
                            () => {});

                        logger.log('chrome-extension/chrome.gotData',
                        'not logged in yet...store: ', data);
                        if (numCalls > 4) {
                            clearInterval(checkInterval);
                        }
                    }
                });
        }
        // call after a while on interval
        var checkInterval = setInterval(checkLoggedInState, 1000 * 45);
        // call almost immediately
        setTimeout(checkLoggedInState, 3);
    }
}
