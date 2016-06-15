/**
 * Injects a chat room into reddit on the side bar
 *
 * @module inject-chat
 */
/**
 * dependencies
 */
import _ from 'lodash';
import $ from 'jquery';
import CONFIG from '../config.js';

import getSubredditName from './get-subreddit-name.js';

//// don't include logger here
// import logger from '../logger.js';
let logger = {log: function() {}};

/**
 *
 * UTIL
 *
 */
var $CARROT_WRAPPER;
var $CARROT_IFRAME;

/**
 * Called to destroy the embed
 */
function destroyEmbed () {
    $('#carrot-room-wrapper').remove();
    $('.carrot-room-wrapper-div').remove();
    if ($CARROT_WRAPPER && $CARROT_WRAPPER.remove) { $CARROT_WRAPPER.remove(); }
}

/**
 * Called to create the embedded room
 */
function createEmbed (subredditName) {
    // Destroy existing embed
    destroyEmbed();

    // Check that a subreddit was passed in
    if(!subredditName){
        logger.log('carrot/injectChatRoom', 'no subreddit found');
        return false;
    }

    // Setup carrot url
    logger.log('carrot/injectChatRoom', 'found subreddit:', subredditName);

    // URL for the chat embed
    let carrotUrl = CONFIG.carrotUrl + 'embed/r/' + subredditName;

    let iconUrl = 'https://carrot-prod-assets.s3.amazonaws.com/icons/' + subredditName.toLowerCase() + '.png';
    let headerIconsUrl = chrome.extension.getURL('img/extension__header-icons.png');

    // add wrapper
    // Note that we must insert multiple empty iframes because often times 
    // Ads will hijack the carrot iframe, causing all sorts of jankiness.
    // These iframes do absolutely nothing, have no URL; they're just there
    // to prevent the carrot embed iframe from being destroyed / hijacked
    //
    // NOTE: Adding buttons before they're rendered is problematic because
    // you cannot click them (JS hasn't rendered them yet).
    // to add the buttons, use: 
    //      <img class="embed-header__window-actions" src="${headerIconsUrl}">

    // start minimized
    $CARROT_WRAPPER = $('<div id="carrot-room-wrapper" class="carrot-room-wrapper-div minimized loading"></div>').css({ 'class': 'spacer' })
    .html(`
        <iframe id='carrot__iframe-buffer-pre' height='0px' width='0xp' frameborder=0 style='display: none; border: none; z-index: 0; opacity: 0;' src=''> </iframe>
        <iframe id='carrot__iframe-buffer-pre-2' height='0px' width='0xp' frameborder=0 style='display: none; border: none; z-index: 0; opacity: 0;' src=''> </iframe>

        <iframe id='carrot__iframe' height='100%' width='100%' frameborder=0 style='border: none;' src='${carrotUrl}'> </iframe>
        <div class='loading__wrapper'>
            <div class="embed-header embed-header">
                <img src="${iconUrl}" class="embed-header__logo u-mar-right-small" />
                <span class="embed-header__title u-mar-right-micro">${subredditName}</span>
                <span class="embed-header__label">
                    <span> </span>
                    <span> </span>
                    <span> </span>
                </span>
                <div id='embed-preload-close'>
                    <img src="https://prod-assets.carrot.com/img/extension/close.png" />
                </div>
            </div>
        </div>
        
        <iframe id='carrot__iframe-buffer-post' height='0px' width='0xp' frameborder=0 style='display: none; border: none; z-index: 0; opacity: 0;' src=''> </iframe>
        <iframe id='carrot__iframe-buffer-post-2' height='0px' width='0xp' frameborder=0 style='display: none; border: none; z-index: 0; opacity: 0;' src=''> </iframe>
    `);

    requestAnimationFrame(function () {
        $('body').append($CARROT_WRAPPER);
        $CARROT_IFRAME = $('#carrot__iframe');

        // allow close button to close embed
        $('#embed-preload-close').click(function () {
            destroyEmbed();
        });

        // Check if mod tools extension is installed
        setTimeout(function () { 
            requestAnimationFrame(function () {
                // If the mod tools extension is installed, move the extension
                // over to not cover up mod tools
                if ($('#tb-toolbarcounters').children().length > 0) {
                    $('#tb-toolbarcounters').css({ 'margin-right': '330px' });
                }
            });
        }, 2000);
    });
}

/**
 *
 * Functionality
 *
 */
export default function injectChatRoom () {
    // Get reddit name from URL
    // Only embed chat on pages which have a subreddit (and home page)
    let subredditName = getSubredditName();
    if (!subredditName) { return false; }

    /**
     * Inject chat if subreddit is valid
     */
    chrome.runtime.sendMessage({
        messageType: 'checkForValidSubreddit',
        subreddit: subredditName
    },
    function (data){
        if (!data.isValid) {
            // Do nothing
            logger.log('carrot/injectChatRoom:noSubredditExists',
            'no subreddit exists');
            return false;
        }

        // get prop casing
        subredditName = data.slug;

        // Create embed
        createEmbed(subredditName);

        /**
         * listen for minimize / maximize
         */
        let firstTimeEmbedWasOpenedAfterPageLoad = true;
        // starts closed by default
        let embedIsOpen = false;

        let embedOpenDate;
        let embedHideDate = new Date(); // time before first open starts now

        let createdDate = new Date();
        let secondsEmbedWasOpened = null;
        let secondsBeforeOpen = null;
        let wasClicked = false;

        let embedWasManuallyDestroyed = false;

        window.addEventListener('message', (e) => {
            logger.log('carrot/injectChatRoom:gotMessage', 'got message: ', e);

            if (e.data === 'chat-window:loaded'){
                $CARROT_WRAPPER.removeClass('loading');
                /**
                 * Get store state once loaded and open it automatically if
                 * needed
                 */
                chrome.runtime.sendMessage({ messageType: 'getState' }, function (data){
                    // open by default if it was previously open
                    setTimeout(function () { requestAnimationFrame(function () { 
                        if (wasClicked) { return false; }
                        if (data.app.embedStateBySlug && data.app.embedStateBySlug[subredditName] === true) {
                            document.getElementById('carrot__iframe').contentWindow.postMessage('embed-from-extension:minimize', '*')
                        }
                    }); }, 1100);
                });

            // user minimized or opened embed
            } else if (e.data === 'chat-window:minimize:clicked'){
                // if the embed was already destroyed, do nothing
                if (embedWasManuallyDestroyed) { return false; }

                wasClicked = true;
                $CARROT_WRAPPER.toggleClass('minimized');
                embedIsOpen = !$CARROT_WRAPPER.hasClass('minimized');
                
                // set embed open state
                chrome.runtime.sendMessage({ 
                    messageType: 'setStateEmbed', 
                    isOpen: embedIsOpen, slug: subredditName
                }, function (){});

                // track how long embed was opened
                if (embedIsOpen) {
                    embedOpenDate = new Date();
                    secondsEmbedWasOpened = null;
                    secondsBeforeOpen = (new Date() - embedHideDate) / 1000;

                } else {
                    embedHideDate = new Date();
                    secondsEmbedWasOpened = (new Date() - embedOpenDate) / 1000;
                    secondsBeforeOpen = null;
                }

                // send 'analytics' that we've toggled the embed / closed / 
                // destroyed it so that we can let other users know of the
                // activity / online / idle state of the user
                //
                // We need to send over the subreddit name so we can mark your
                // user room message state as 'read' or 'unread' depending 
                // if the embed was opened or closed, so that your room 
                // read / unread counts can be synced
                chrome.runtime.sendMessage({
                    messageType: 'analytics:embedToggle',
                    embedState: embedIsOpen ? 'opened' : 'closed',
                    subredditName: subredditName,
                    firstTimeEmbedWasOpenedAfterPageLoad: firstTimeEmbedWasOpenedAfterPageLoad,
                    secondsBeforeOpen: secondsBeforeOpen,
                    secondsEmbedWasOpened: secondsEmbedWasOpened
                }, () => {});

                // not the first time anymore
                firstTimeEmbedWasOpenedAfterPageLoad = false;

            } else if (e.data === 'chat-window:close'){
                // ensure we track that it was manually destroyed
                embedWasManuallyDestroyed = true;

                chrome.runtime.sendMessage({ 
                    messageType: 'setStateEmbed', 
                    isOpen: false, slug: subredditName
                }, function (){});

                chrome.runtime.sendMessage({
                    messageType: 'analytics:embedDestroyed',
                    subredditName: subredditName,
                    secondsBeforeDestroyed: (new Date() - createdDate) / 1000
                }, () => {});

                destroyEmbed();
            }
        });

        /**
         * On visibility change, destroy window and re-inject
         */
        // destroy embeded chat after a delay
        var destroyTimeout;
        var didSendDisconnect = false;

        function visibilityChanged () {
            logger.log('carrot/injectChatRoom:visibilityChanged',
            'visibility changed to: ' + document.visibilityState);

            // always clear timeout
            clearTimeout(destroyTimeout);

            // Check for visible state
            if(document.visibilityState === 'hidden'){
                // destroy room after 5 minutes
                destroyTimeout = setTimeout(() => {
                    // hidden, disconnect from socket
                    didSendDisconnect = true;
                    $CARROT_IFRAME[0].contentWindow.postMessage({
                        messageType: 'socket:disconnect'
                    }, '*');
                }, 1000 * 60 * 5);

            } else {
                // Window is visible; create room if it doesn't exist
                if (didSendDisconnect) {
                    $CARROT_IFRAME[0].contentWindow.postMessage({
                        messageType: 'socket:connect'
                    }, '*');
                }
            }
        }

        document.addEventListener("visibilitychange", visibilityChanged);
    });
}
