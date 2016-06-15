/**
 * Fetches notifications and returns callback with nofitications
 *
 * @module util/fetch-notifications
 */
import $ from 'jquery';
import _ from 'lodash';
import logger from '../logger.js';
import CONFIG from '../config.js';

import async from 'async';

import store from "../store/store.js";
import * as ACTIONS from '../store/actions.js';
import * as tabs from '../browser-specific/tabs.js';
import findCarrotOrRedditTab from './find-carrot-or-reddit-tab.js';

/**
 * private function for handling the actual fetching of messages
 */
function fetchNotifications (options, callback) {
    let storeData = store.getState().app;
    let unreadCount = 0;
    if (storeData.notifications) { unreadCount = storeData.notifications.unreadCount; }

    let wasCalledFromPopup = options.wasCalledFromPopup;
    let forceOnlineFetch = options.forceOnlineFetch;

    findCarrotOrRedditTab((err, foundIt) => {
        // Make request for notifications
        return $.ajax({
            url: CONFIG.carrotUrl + 'api/me/unread?fromExtension=true' +
                '&alwaysSendNotifications=' + storeData.notificationSendSettings.alwaysSend +
                '&hasCarrotOrRedditOpen=' + foundIt +
                '&numNotificationsUnread=' + unreadCount +
                '&numNotificationsTotal=' + storeData.notifications.items.length +
                '&calledFromOpeningPopup=' + !!wasCalledFromPopup
        }).then(
            (res) => {
                logger.log('fetchNotifications', 'fetched successfully');
                if(!res){ return callback({error: true, message: 'No res'}); }
                if(!res.meta){ return callback({error: true, message: 'No meta '}); }
                if(res.meta.error){ 
                    return callback(res.meta, null);
                }

                let forceFetchDelay = 1000 * 60 * 10; // 10 mins
                // 3 second delay if called directly on popup (meaning, force
                // a refetch almost every time the user opens the popup)
                if (wasCalledFromPopup) { forceFetchDelay = 1000 * 3; }

                let lastFetchDate = storeData.lastServerRoomStateFetchDate;
                // force refetch after a few hours if we haven't gotten new 
                // data yet
                let shouldForceRefetch = ((Date.now() - lastFetchDate) > (
                    forceFetchDelay
                ));

                // secondly, fetch room state based on unread state
                if (res.response.unreadByRoom) {
                    let roomsBySlug = {};
                    let roomsToFetch = [];

                    _.each(res.response.unreadByRoom, function (d, key) {
                        if (shouldForceRefetch) {
                            roomsToFetch.push(key);
                        }

                        // was there previous data for this room?
                        if (!storeData.serverRoomStateBySlug || (
                        storeData.serverRoomStateBySlug && !storeData.serverRoomStateBySlug[key])) {
                            // data doesn't exist yet
                            roomsToFetch.push(key);

                        } else if (storeData.unreadByRoom && storeData.unreadByRoom[key] && storeData.unreadByRoom[key].count !== d.count) {
                            // If the count is NOT the same, we need to fetch
                            roomsToFetch.push(key);
                        }
                    });

                    // Fetch online count for each room
                    // Only do this if it was called from the popup. We don't
                    // need to know the online count if the user doesn't
                    // have the popup open
                    // ONLY fetch online counts if the extension is open
                    let forceOnlineFetch = (
                        (Date.now() - (lastFetchDate || 0)) > (
                        1000 * 60 * 60 * 2 // every two hours, force refetch
                    ));

                    if (wasCalledFromPopup || forceOnlineFetch) {
                        async.each(roomsToFetch, function (slug, cb) {
                            $.ajax({
                                url: CONFIG.carrotUrl + 'api/r/' + slug + '/simple-with-online',
                                success: function (res) {
                                    if (res && res.response && (res.meta && !res.meta.error)) {
                                        roomsBySlug[slug] = res.response;
                                    }
                                    return cb();
                                },
                                error: function () { return cb(); }
                            });
                        }, function (err) {
                            if (Object.keys(roomsBySlug).length > 0) {
                                // Update store with fetched room state
                                store.dispatch(ACTIONS.updateRoomStateFromServer(roomsBySlug));
                            }
                        });
                    }
                }

                // Update unread count if carrot / reddit is open
                tabs.fetchActiveTab(function (err, activeTab) {
                    if (activeTab && activeTab.url && 
                    (activeTab.url.indexOf(CONFIG.carrotUrl) > -1 ||
                    activeTab.url.indexOf('reddit.com') > -1)) {
                        let currentRoom = activeTab.url.match(/\/r\/([^\/]+)/);

                        // set unread count to 0 for current room
                        if (currentRoom && currentRoom[1]) {
                            currentRoom = currentRoom[1];

                            if (res && res.response && 
                            res.response.unreadByRoom &&
                            res.response.unreadByRoom[currentRoom]) {
                                // set to 0
                                res.response.unreadByRoom[currentRoom].count = 0;
                                res.response.unreadByRoom[currentRoom].mentioned = false;
                                res.response.unreadByRoom[currentRoom].lastMentionedTimestamp = 1;
                            }
                        }
                    }

                    // success
                    return callback(null, res);
                });
            },
            (err) => {
                logger.log('error:fetchNotifications', 'error fetching');
                return callback({error: true, err: err, status: 500});
            }
        );
    });
}

/**
 *
 * Main notification fetcher + updater function
 *
 */
export default function fetchAndUpdateNotifications (options, callback) {
    options = options || {};
    callback = callback || function () {};
    logger.log('fetchAndUpdateNotifications:called', 'called with: ', options);

    // gotta fetch 'em all (fetch all notifications
    fetchNotifications({
        wasCalledFromPopup: options.wasCalledFromPopup,
        forceOnlineFetch: options.forceOnlineFetch
    }, (err, res) => {
        if(err){
            logger.log('error:notificationFetcher:fetched', 'error fetching', err);

            // If 422 error, means user is NOT logged in
            if(err.statusCode === 422){
                logger.log('error:notificationFetcher:loggedOut', 'not logged in');

                if(options.triggerAction === true){
                    // This may be called from popup.js, in which case we want to
                    // update the background script
                    chrome.runtime.sendMessage({
                        messageType: 'action',
                        action: ACTIONS.disconnectError511()
                    }, function (res) { });
                } else {
                    store.dispatch(ACTIONS.disconnectError511());
                }
            }

            return callback(err);
        }

        /**
         * Got notifications successfully
         */
        logger.log('notificationFetcher:fetched', 'got messages', res);
        var actionOptions = {
            notifications: res.response.notifications,
            lastReadDate: res.response.lastReadDate,
            lastClearDate: res.response.lastClearDate,
            unreadByRoom: res.response.unreadByRoom,
            username: res.meta.username || null
        };

        store.dispatch(ACTIONS.notificationAddMultipleFromServer(actionOptions));

        return callback(err);
    });
}
