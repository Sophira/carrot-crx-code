/**
 * Main background script
 *
 * @module background.js
 *
 */
import $ from 'jquery';
import logger from '../logger.js';
import CONFIG from '../config.js';
import installFlow from './install-flow.js';
import {setBadge, setBadgeBasedOnState} from '../util/set-badge.js';
import {setActiveCarrotTab} from './install-flow.js';
import setupCarrotTabTracking from './setup-tab-events.js';
import {default as analyticsSend} from '../util/analytics.js';
import findCarrotOrRedditTab from '../util/find-carrot-or-reddit-tab.js';
import setExtensionIconBasedOnHiddenState from '../util/extension-icon.js';

import * as tabs from '../browser-specific/tabs.js';
import setupValidReddits from './setup-valid-reddits.js';
import processNotification from '../util/process-notification.js';
import setupNotificationFetcher from './setup-notification-fetcher.js';
import fetchAndUpdateNotifications from '../util/fetch-notifications.js';
import openOrAccessCarrotPage from '../util/open-or-access-carrot-page.js';
import {getLastNotificationOptions} from '../util/last-notification-options.js';
import updateNotificationLastReadDate from '../util/update-notification-last-read-date.js';

let VERSION = '0.0.0';
if (chrome && chrome.runtime && chrome.runtime.getManifest) {
    var manifest = chrome.runtime.getManifest();
    VERSION = manifest.version;
}


// redux store, used to manage state and actions
import store from '../store/store.js';
import * as ACTIONS from '../store/actions.js';

/**
 *
 * CONFIG
 *
 */
let _fetchedInitialState = true;

/**
 *
 * Listen for messages from popup / content to update this store
 *
 */
chrome.runtime.onMessage.addListener(function gotMessage (message, sender, sendResponse) {
    logger.log('background/onMessage', 'got message: ', message);

    function handleMessage () {
        if (!message || !message.messageType){
            // do nothing, no message or message type
            return true;
        }

        var storeData = store.getState().app;
        let url;

        // Receiving updates from Popup Window and Content Scripts
        switch(message.messageType){
            case 'action':
                // dispatch an action for THIS store, which will update this
                // stores state, triggering a message which other scripts
                // listen for to change their store
                store.dispatch(message.action);
                break;

            case 'updateNotificationLastReadDate':
                // Update notification read date on server
                updateNotificationLastReadDate(function(err, res){});
                break;

            case 'getState':
                sendResponse(store.getState());
                return true;

            /**
             * called during install flow after successful reddit login
             */
            case 'redditLoginButtonClicked':
                store.dispatch(ACTIONS.setState({forceLoadingPageOnRedditVisit: true}));
                break;

            case 'openCarrotAfterRedditLogin':
                logger.log('background/onMessage:openCarrotAfterRedditLogin', 'called');
                store.dispatch(ACTIONS.setState({ forceLoadingPageOnRedditVisit: false }));

                tabs.fetchActiveTab(function(err, tab){
                    tab = tab || {id: 1};

                    // remove current tab and create a new one for the loading
                    // page
                    tabs.removeTab(tab.id, function(){
                        url = CONFIG.carrotUrl;
                        return tabs.createTab({
                            url: url
                        });
                    });

                    // trigger login flow
                    loginFlow({skipCarrotCheck: true});
                });

                break;

            case 'openCarrot':
                url = CONFIG.carrotUrl;
                if (message.slug) { url += 'r/' + message.slug; }
                setActiveCarrotTab({url: url}, function (err, res) {});
                break;

            case 'log':
                logger.log('background/onMessage:log', message.message);
                break;

            case 'openRedditLoginPage':
                // sent from popup when clicking on reddit button
                setActiveCarrotTab({ onlyCloseTabs: true }, (err) => {
                    return tabs.createTab({url: 'https://www.reddit.com/login#fromCarrot'});
                });
                return true;

            case 'fetchAndUpdateNotifications':
                // force fetch of unread count / check logged in state 
                let fetchOptions = {};
                if (message.options) { fetchOptions = message.options; }
                fetchAndUpdateNotifications(fetchOptions);
                return true;

            case 'logout':
                // clear out username
                store.dispatch(ACTIONS.setState({username: null}));
            
                // close all carrot tabs
                tabs.fetchTabsForDomain(CONFIG.carrotUrl, (err, res) => {
                    // If not found, open new tab
                    if (!res || (res && res.length < 1)){
                        logger.log('notification-item-clicked:no-carrot-tab-found',
                        'could not find carrot', res);

                    } else {
                        for (var i = 0; i < res.length; i++) {
                            tabs.removeTab(res[i].id);
                        }
                    }

                    setTimeout(() => {
                        // sent from popup when clicking on reddit button
                        tabs.createTab({
                            url: CONFIG.carrotUrl + 'api/logout'
                        });
                    }, 200);

                });
                return true;

            case 'redditLogin':
                // sent from popup when clicking on reddit button
                tabs.createTab({
                    url: CONFIG.carrotUrl + 'api/auth/reddit?fromExtension=true&version=' + VERSION
                });
                return true;

            case 'notificationItemClicked':
                // Called from popup to open a target window from a notification
                // e.g., when clicking on a notification item
                openOrAccessCarrotPage(message.targetUrl);

                break;

            case 'notificationPopupClicked':
                // handle notification pop click
                var options = processNotification(getLastNotificationOptions());

                findCarrotOrRedditTab((err, foundIt) => {
                    analyticsSend({
                        hasCarrotOrRedditOpen: foundIt,
                        group: 'pushPopup:clicked',
                        alwaysSendNotifications: storeData.notificationSendSettings.alwaysSend,
                        notification: options,
                        notificationMessageType: options.notificationMessageType
                    });
                });

                openOrAccessCarrotPage(options.targetUrl);
                break;

            /**
             * Analytics
             * Don't worry, this isn't some nefarious tracking. We just need to
             * know when clients toggle the embed open or destroy it
             */
            case 'analytics:embedToggle':
                let analyticsOptions = {
                    group: 'embedToggle',
                    routingKey: message.subredditName,
                    embedState: message.embedState,
                    firstTimeEmbedWasOpenedAfterPageLoad: message.firstTimeEmbedWasOpenedAfterPageLoad,
                    alwaysSendNotifications: storeData.notificationSendSettings.alwaysSend
                };

                if (message.secondsEmbedWasOpened > 0) {
                    analyticsOptions.secondsEmbedWasOpened = message.secondsEmbedWasOpened;
                }
                if (message.secondsBeforeOpen > 0) {
                    analyticsOptions.secondsBeforeOpen = message.secondsBeforeOpen;
                }

                analyticsSend(analyticsOptions);
                break;

            case 'analytics:embedDestroyed':
                analyticsSend({
                    group: 'embedDestroy',
                    routingKey: message.subredditName,
                    secondsBeforeDestroyed: message.secondsBeforeDestroyed,
                    alwaysSendNotifications: storeData.notificationSendSettings.alwaysSend
                });
                break;

            case 'analytics:send':
                delete message.messageType;
                analyticsSend(message);
                break;

            case '_keepAlive':
                // do nothing
                break;

            case 'fetchStoreState':
                sendResponse({
                    storeState: store.getState().app
                });
                return true;


            case 'clearUnreadCountForSlug':
                // sent from popup when clicking on reddit button
                store.dispatch(ACTIONS.clearUnreadCountForSlug(message.slug));
                return true;

            /**
             * called by other content / popup script to set specific state
             */
            case 'setState':
                store.dispatch(ACTIONS.setState(message.state));
                break;

            case 'setStateEmbed':
                store.dispatch(ACTIONS.setStateEmbed(message.slug, message.isOpen));
                break;

            case 'toggleExtensionHiddenState': 
                let isHidden = !!!storeData.extensionIsHidden;

                // set the chrome extension icon
                setExtensionIconBasedOnHiddenState(isHidden);

                // update badge
                // very ugly, very much an antipattenr; 
                // but set it right now and set badge based on isHidden state
                storeData.extensionIsHidden = isHidden;
                let badgeInfo = setBadgeBasedOnState(storeData);
                setBadge(badgeInfo.badgeText, badgeInfo.badgeBackgroundColor);
                
                // set state
                store.dispatch(ACTIONS.setState({extensionIsHidden: isHidden}));
                break;

            default:
                return true;
        }

        return true;
    }

    if (_fetchedInitialState){ handleMessage(); }
    else {
        // if initial state hasn't been fetched yet (this should never happen,
        // as the background is loaded before the user loads the popup), get
        // the initial state and then handle the message
        getInitialStoredState(handleMessage);
    }

    // NOTE: we must return true here if we want to support async events (e.g.,
    // fetching local storage on a message event), because:
    // This function becomes invalid when the event listener returns, unless
    // you return true from the event listener to indicate you wish to send a
    // response asynchronously (this will keep the message channel open to the
    // other end until sendResponse is called).
    return true;
});


/**
 *
 * INITIAL Loading / Setup
 *
 */
/**
 * Fetches initial local storage state (grabs entire app state) and sets
 * the redux store state. From there, the `storeUpdate` callback below
 * (which listens for store changes) handles all other logic.
 * This is called immediately.
 */
function getInitialStoredState (callback) {
    callback = callback || function(){};

    // Load the initial state (if it exists). So far, we only care about
    // notification state. Other states must be updated and require socket
    // connections
    chrome.storage.local.get('appState', function gotState (items) {
        logger.log('background/chrome.getInitialStorageState', 'got state: items',
        items);

        let initialState = items.appState;

        // update local state if it exists
        if(initialState){
            store.dispatch(ACTIONS.setInitialState(initialState));
        }

        // Set ID if it hasn't been set
        if(!store.getState().app.generatedId){ store.dispatch(ACTIONS.generateId()); }

        _fetchedInitialState = true;
        return callback(null, items.state);
    });
}

/**
 *
 * Callback when store changes (main logic lives here)
 *
 */
let previousOnlineCount = 100;
let _flashTimeout;
// store previous state so we can do behavior on state changes
let previousStoreState = {notifications: {}};

let isMakingNotificationRequest = false;
let lastNotificationRequestRequest = new Date();

let isBadgeFlashing = false;

/**
 * when store changes, handle updates and inform other scripts
 */
store.subscribe(function storeUpdated () {
    let state = store.getState().app;
    logger.log('background/storeChange', 'got store change', state);

    /**
     * 1. Store local data whenever store changes
     */
    // NOTE: notifications is the only state we load (for now)
    chrome.storage.local.set({appState: state}, function setLocalStorageState (err) {
        if (err){
            return logger.log('error:reducers-app:setState',
            'error setting local state');
        }
        logger.log('background/storeChange:setState', 'set chrome state');
    });

    /**
     * 2. Let *OTHER* scripts know about change
     */
    chrome.runtime.sendMessage({messageType: 'setState', state: state}, function sendMessageSetStateRes (res) {
        logger.log('background/storeChange:sentMessage', 'sent setState message');
    });

    /**
     * 3. check for tab states
     */
    if (state.isCarrotTabActive !== previousStoreState.isCarrotTabActive) {
        // This lets us clear the unread count if we're on carrot
        //
        // if active tab state is different, call fetch to update last read date
        // Only do this when we're not fetching. This is OK, because it's an
        // async function we don't care about the return value - we just need
        // to let the server know we updated the lastReadDate
        //
        // only make the request after n seconds of change
        // TODO: DEV: REMOVE: If we change notification behavior, we need to
        // remove this
        if (isMakingNotificationRequest !== true && new Date() - lastNotificationRequestRequest > 2000) {
            logger.log('background/storeChange:differentActiveState',
                'carrot tab active state is different. Previous: ',
                previousStoreState.isCarrotTabActive,
                ' | current: ' + state.isCarrotTabActive);
            isMakingNotificationRequest = true;

            // update lastReadDate on server
            updateNotificationLastReadDate((err, res) => {
                isMakingNotificationRequest = false;
                lastNotificationRequestRequest = new Date();
            });
        }
    }

    /**
     * Finally, update previously store state
     */
    previousStoreState = state;
});


/**
 *
 * First install flow
 *
 */
chrome.runtime.onInstalled.addListener((details) => {
    if(details.reason === 'update'){
        // Don't do anything on update

    } else {
        // set first install on first install
        store.dispatch(ACTIONS.setIsFirstInstall(true));

        // open tab with pre-oauth flow
        tabs.createTab({
            url: CONFIG.carrotUrl + 'extension-continue'
        });
        
    }
    return installFlow(details);
});

/**
 *
 * Startup
 *
 */
function extensionStartup () {
    getInitialStoredState(() => {
        // setup notifications / unread count fetcher
        setupNotificationFetcher();
        
        let storeData = store.getState().app;
        setExtensionIconBasedOnHiddenState(storeData.extensionIsHidden);

        // update badge
        let badgeInfo = setBadgeBasedOnState(storeData);
        setBadge(badgeInfo.badgeText, badgeInfo.badgeBackgroundColor);

        /**
         * Uninstall tracking. Need to set this here, because we need the
         * generated ID
         */
        chrome.runtime.setUninstallURL(
            CONFIG.carrotUrl + 'extension-uninstall?generatedId=' + store.getState().app.generatedId + '&username=' + store.getState().app.username,
            () => { });

    });

    // Check for updates
    chrome.runtime.onUpdateAvailable.addListener(function(details) {
        logger.log('background', 'updating to version: ' + details.version);
        chrome.runtime.reload();
    });

    // listen for tab changes and set tab open info
    setupCarrotTabTracking();

    // Setup data / tracking flow for managing which subreddits we know are valid
    setupValidReddits();


    /** We are no longer handling notifications
     * TODO: Once we add notifications, uncomment this
    // Notification handler
    chrome.notifications.onClicked.addListener((notif) => {
        chrome.runtime.sendMessage({messageType: 'notificationPopupClicked', notif: notif});
    });
    */
}

// NOTE: Also need to do this every time it launches
logger.log('background/main', 'Launching!');
extensionStartup();
