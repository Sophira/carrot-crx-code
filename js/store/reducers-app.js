/**
 * Main app reducer. NOTE that this is only called from the background script
 * @module reducers-app
 *
 */
import $ from 'jquery';
import _ from 'lodash';
import uuid from 'uuid';
import moment from 'moment';
import CONFIG from '../config.js';
import logger from '../logger.js';
import * as ACTIONS from './actions.js';

import {setBadgeBasedOnState, badgeStateLogin} from '../util/set-badge.js';

/**
 *
 * Reducers
 *
 */
const defaultState = {

    // config passed in from server
    CARROT_CONFIG: {},

    _id: null, // should be generated only once

    username: null,

    // this is true only on first install
    isFirstInstall: false,
    // called for first install to redirect to carrot loading page when reddit
    // loading is taking place
    forceLoadingPageOnRedditVisit: false,

    // Last time that the login/#fromCarrot url was opened from the login flow
    redditLoginRedirectDate: 0,

    // by default, assume logged in (so we don't get flash on popup)
    isLoggedIntoCarrot: true,
    isLoggedIntoReddit: true,

    generatedId: '',

    // tab state
    isCarrotTabOpen: false,
    isCarrotTabActive: false,

    // for tracking installation
    hadFirstSuccessfulAuth: false,

    // badge state
    badgeText: '',
    badgeBackgroundColor: 'yellow',

    websocket: {
        isConnected: false,
        hasError: false
    },

    // popup state
    isPopupOpen: false,
    isLoading: false,


    /**
     * notifs
     */
    allowedNotificationTypes: [
        'mention'
        // Other possible values: 'newRoom', 'hot'
    ],

    /** embed state */
    // object looks like { subredditName: true / false }
    embedStateBySlug: {},

    /**
     * Extension "hidden" state
     */
    extensionIsHidden: false,

    /**
     * Main unread by room notification object
     */
    unreadByRoom: {},
    preivousUnreadByRoom: {},

    // When popup opens, this number is set to the current badge count
    unseenCountForBadge: 0,
    // actual value of badge
    badgeCount: 0,

    // when user opens popup, temporarily clear the badge count. Whenever
    // the count is different from the server, it will re-set to the current
    // value
    clearedBadgeCountValue: -1,
    hasMention: false,

    // Room object state (from server requests)
    serverRoomStateBySlug: {},
    lastServerRoomStateFetchDate: 0,

    /**
     * Other
     */
    // values updated
    totalOnlineUsersCount: 0,

    notifications: {
        lastReadDate: 0,
        lastClearDate: null,
        items: [],
        // cached ID array to check for membership
        itemIds: [],
        unreadCount: 0
    },

    analyticsSentLoginFlowComplete: false

    // not yet implemented (notifications not yet implemented)
    ,notificationSendSettings: {
        alwaysSend: true
    }
};

/**
 * Main app reducer
 */
export default function app (state=defaultState, action) {
    var newState;
    var tmpState;
    var now;
    var notificationId;
    var notificationIndex;

    switch (action.type) {
        case ACTIONS.SET_STATE:
            newState = Object.assign({}, state, action.state);

            logger.log('reducers-app:SET_STATE', 'called with', action);
            return newState;

        case ACTIONS.SET_STATE_EMBED:
            newState = Object.assign({}, state, action.state);
            newState.embedStateBySlug = newState.embedStateBySlug || {};
            
            // set state to be either true / false
            newState.embedStateBySlug[action.slug] = !!action.isOpen;

            return newState;

        case ACTIONS.SET_NOTIFICATIONS_ALWAYS_SEND:
            newState = Object.assign({}, state);
            newState.notificationSendSettings.alwaysSend = true;
            return newState;


        case ACTIONS.SET_INITIAL_STATE:
            // Global state update to keep all scripts in sync
            newState = state;

            if(action.state) {
                newState = _.cloneDeep(action.state);
            }
            return newState;

        case ACTIONS.SET_IS_FIRST_INSTALL:
            newState = Object.assign({}, state, action.state);
            newState.isFirstInstall = action.isFirstInstall;
            return newState;

        case ACTIONS.SET_FORCE_REDDIT_REDIRECT_TO_CARROT_LOADING:
            newState = Object.assign({}, state, action.state);
            newState.forceLoadingPageOnRedditVisit = action.value;
            return newState;

        /**
         * Identity
         */
        case ACTIONS.GENERATE_ID:
            // if _id already exists, do not set a new one
            if(state.generatedId){ return state; }
            else {
                newState = Object.assign({}, state);
                if (!newState.generatedId || newState.generatedId === '') {
                    newState.generatedId = uuid.v4();
                }
                return newState;
            }
            break;

        case ACTIONS.SET_USERNAME:
            // set username
            newState = Object.assign({}, state);
            newState.username = action.username;
            return newState;

        case ACTIONS.SET_TOTAL_ONLINE_USERS_COUNT:
            newState = Object.assign({}, state);
            newState.totalOnlineUsersCount = action.count;
            return newState;

        /**
         * Set tab states
         */
        case ACTIONS.SET_CARROT_TAB_STATE:
            // do a shallow clone, we can keep refs to notifications
            newState = Object.assign({}, state);

            if (action.options.active !== undefined) {
                // Set last read date when user switches FROM carrot to another
                // tab
                if (state.isCarrotTabActive && !action.options.active) {
                    // clear out count and track the last read date, so
                    // we can ignore new notifications if we get any while
                    // we're not active
                    newState.notifications.unreadCount = 0;
                    newState.notifications.lastReadDate = new Date();
                }

                // when user switches from another tab TO carrot, clear out
                // badge counts (when tab was NOT active and NOW it is)
                if (!state.isCarrotTabActive && action.options.active) {
                    // same behavior as above, but we if we wanted to add any
                    // other state changes here, we would do it here
                    newState.notifications.unreadCount = 0;
                    newState.notifications.lastReadDate = new Date();
                }

                newState.isCarrotTabActive = action.options.active;
            }

            if (action.options.open !== undefined) {
                newState.isCarrotTabOpen = action.options.open;
            }

            setBadgeBasedOnState(newState);

            return newState;

        case ACTIONS.CHANGE_BROWSER_NOTIFICATION_SEND_SETTING:
            // do a shallow clone, we can keep refs to notifications
            newState = Object.assign({}, state);

            newState.notificationSendSettings = newState.notificationSendSettings || {};
            newState.notificationSendSettings.alwaysSend = action.alwaysSend;
            return newState;


        /**
         * HTTP GET ERRORS
         */
        case ACTIONS.DISCONNECT_ERROR_511:
            newState = _.cloneDeep(state);

            newState.isLoggedIntoCarrot = false;
            newState.username = null;

            badgeStateLogin(newState);
            return newState;

        /**
         * Login flow
         */
        case ACTIONS.LOGIN_FLOW_REDDIT_NO_LOGIN:
            newState = Object.assign({}, state, {
                isLoggedIntoReddit: false, isLoading: false
            });
            return newState;

        case ACTIONS.LOGIN_FLOW_REDDIT_HAS_LOGIN_NO_CARROT:
            newState = Object.assign({}, state, {
                isLoggedIntoReddit: true,
                isLoggedIntoCarrot: false,
                isLoading: true
            });
            badgeStateLogin(newState);
            return newState;

        case ACTIONS.LOGIN_FLOW_REDDIT_FAILED_TO_LOGIN:
            newState = Object.assign({}, state, {
                isLoggedIntoReddit: false
            });
            if(action.username){ newState.username = action.username; }

            return newState;

        case ACTIONS.LOGIN_FLOW_CARROT_FAILED_TO_LOGIN:
            newState = Object.assign({}, state, {
                isLoggedIntoCarrot: false, isLoading: true
            });
            return newState;

        case ACTIONS.LOGIN_FLOW_COMPLETE:
            newState = _.cloneDeep(state);
            newState.isLoggedIntoReddit = true;
            newState.isLoggedIntoCarrot = true;
            newState.loginError = false;
            newState.isLoading = false;
            if(action.username){
                newState.username = action.username;
            }

            // reset first install values
            newState.isFirstInstall = false;
            newState.forceLoadingPageOnRedditVisit = false;

            setBadgeBasedOnState(newState);

            return newState;

        /**
         * Popup related
         */
        case ACTIONS.CHROME_POPUP_OPEN:
            newState = _.cloneDeep(state);

            // reset badge count to 0 on open
            newState.clearedBadgeCountValue = newState.badgeCount; 
            if (newState.username) { newState.badgeCount = 0; } 
            else { newState.badgeCount = ''; }

            newState.isPopupOpen = true;
            setBadgeBasedOnState(newState);

            return newState;

        case ACTIONS.CHROME_POPUP_CLOSE:
            newState = _.cloneDeep(state);
            if (!newState.username){ newState.badgeCount = ''; }

            newState.isPopupOpen = false;
            setBadgeBasedOnState(newState);
            return newState;

        /**
         *
         * NOTIFICATIONS
         *
         */
        case ACTIONS.CLEAR_LOCAL_NOTIFICATIONS:
            // clear locally saved notifications
            newState = _.cloneDeep(state);

            newState.notifications.items = [];
            newState.notifications.itemIds = [];
            newState.notifications.unreadCount = 0;
            return newState;

        /**
         * Add multiple notifications from the server
         * Default action triggered on successful unread count return
         */
        case ACTIONS.NOTIFICATION_ADD_MULTIPLE_FROM_SERVER:
            newState = _.cloneDeep(state);
            now = Date.now();
            newState.hadFirstSuccessfulAuth = true;

            // ensure date is legit
            if (new Date(newState.notifications.lastReadDate) &&
            isNaN(new Date(newState.notifications.lastReadDate).getTime()) ){
                newState.notifications.lastReadDate = 0;
            }

            // get last read date from server
            if(!action.lastReadDate){ action.lastReadDate = new Date(); }
            else { action.lastReadDate = new Date(action.lastReadDate); }

            // TODO: change this if we switch to per notif read state
            // Note: Only set if the date from server is newer than the
            // locally stored date (because local may update date)
            if (action.lastReadDate > newState.notifications.lastReadDate) {
                newState.notifications.lastReadDate = action.lastReadDate;
            }

            let newNotifications = [];

            newState.unreadByRoom = action.unreadByRoom;

            // if these came from the server, we're also logged into carrot
            newState.isLoggedIntoCarrot = true;
            newState.username = action.username;

            // calculate badge count based on unread counts
            let badgeCountFromServer = 0;
            newState.hasMention = false;
            newState.unreadByRoom = newState.unreadByRoom || {};

            let notificationsToSend = [];

            _.each(newState.unreadByRoom, function(d, key) { 
                if (d.mentioned === true) { 
                    newState.hasMention = true;

                    // increase by 1 for each mention
                    badgeCountFromServer += 1;

                    // Check if we got a mention
                    if (!newState.previousUnreadByRoom || !newState.previousUnreadByRoom[key] || !newState.previousUnreadByRoom[key].lastMentionedTimestamp ||
                    (d.lastMentionedTimestamp && d.lastMentionedTimestamp > newState.previousUnreadByRoom[key].lastMentionedTimestamp)) {
                        // increase last mentioned timestamp to avoid repeated notifs
                        d.lastMentionedTimestamp = d.lastMentionedTimestamp + 1;

                        notificationsToSend.push({
                            notificationMessageType: 'mention',
                            title: "Mentioned in #" + key,
                            message: "You've been mentioned in #" + key
                        });
                    }
                }
            });

            if (newState.clearedBadgeCountValue !== badgeCountFromServer) {
                newState.badgeCount = badgeCountFromServer;
                newState.badgeCount -= (newState.unseenCountForBadge || 0);
                // reset to -1 so we don't skip showing if the badge count
                // becomes the same value (which means the user must re-open
                // the popup to clear the value)
                newState.clearedBadgeCountValue = -1;
            }

            // mutate badge state
            setBadgeBasedOnState(newState);

            // ensure loading state is set properly
            newState.isLoading = false;

            newState.previousUnreadByRoom = _.cloneDeep(newState.unreadByRoom);

            // TODO: Play mention if no other carrot tabs are open and the user
            // got mentioned (but not here; reducer should be side-effect free)
            return newState;

        case ACTIONS.CLEAR_UNREAD_COUNT_FOR_SLUG:
            // clears count for an individual slug
            newState = _.cloneDeep(state);

            newState.unreadByRoom = newState.unreadByRoom || {};
            if (newState.unreadByRoom && newState.unreadByRoom[action.slug]) {
                newState.unreadByRoom[action.slug] = {
                    lastReadTimestamp: Date.now(),
                    count: 0,
                    mentioned: false
                };
            }

            // TODO: Do not duplicate this logic; place this elsewhere
            // calculate badge count based on unread counts
            newState.badgeCount = 0;
            newState.hasMention = false;
            _.each(newState.unreadByRoom, function(d) { 
                if (d.mentioned === true) { 
                    // only increase badge count if user was mentioned. If we
                    // want to include ALL counts, do it above
                    newState.badgeCount += 1;
                    newState.hasMention = true;
                }
            });
            newState.badgeCount -= (newState.unseenCountForBadge || 0);
            newState.clearedBadgeCountValue = -1;

            // mutate badge state
            setBadgeBasedOnState(newState);
            return newState;


        case ACTIONS.UPDATE_ROOM_STATE_FROM_SERVER:
            newState = _.cloneDeep(state);
            newState.serverRoomStateBySlug = newState.serverRoomStateBySlug || {};

            // overwrite whatever state previously existed
            _.each(action.roomsBySlug, function (d, key) {
                newState.serverRoomStateBySlug[key] = d;
            });

            newState.lastServerRoomStateFetchDate = Date.now();
            return newState;

        /**
         * Notifications - read
         *
         * NOTE: Notifications are not yet fully implemented
         */
        case ACTIONS.NOTIFICATION_READ_ALL:
            newState = _.cloneDeep(state);

            newState.notifications.unreadCount = 0;
            newState.notifications.lastReadDate = new Date();

            // mutate badge state
            setBadgeBasedOnState(newState);

            return newState;

        case ACTIONS.NOTIFICATION_READ:
            newState = _.cloneDeep(state);

            notificationIndex = newState.notifications.itemIds.indexOf(action.notificationId);
            if(notificationIndex === -1){
                logger.log('error:reducers-app', 'error marking notification as read', action);
                return newState;
            }

            newState.notifications.items[notificationIndex].isRead = true;
            return newState;

        /**
         * Notifications - Remove
         * For 'removal', because we will always get a batch of notifications
         * from the server, we don't actually delete the local objects, but
         * just mark them as deleted and trim older notifications (the server
         * won't send more than `maxServerNotificationLength`, which is set
         * in the meta on notif responses)
         */
        case ACTIONS.NOTIFICATION_REMOVE_ALL:
            // TODO: let backend remove notifs
            newState = _.cloneDeep(state);
            newState.notifications.unreadCount = 0;
            newState.notifications.lastReadDate = new Date();

            setBadgeBasedOnState(newState);

            // remove old notifs
            newState.notifications.items.splice(30, newState.notifications.items.length);
            // mark as deleted
            _.each(newState.notifications.items, function(item){ item.removed = true; });

            return newState;

        case ACTIONS.NOTIFICATION_DELETE:
            // Deletes an individual notification
            newState = _.cloneDeep(state);
            newState.notifications.lastReadDate = new Date();

            notificationId = action.notificationId;
            notificationIndex = newState.notifications.itemIds.indexOf(notificationId);

            if(notificationIndex === -1){
                logger.log('error:reducers-app', 'error deleting notification', action);
                // could not find
                return newState;
            }

            // remove old notifs
            newState.notifications.items.splice(notificationIndex, 1);
            newState.notifications.itemIds.splice(notificationIndex, 1);

            return newState;

        default:
            return state;
    }
}
