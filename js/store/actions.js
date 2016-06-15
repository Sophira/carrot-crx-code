/**
 *
 * actions.js
 *      Action constants and action creators
 *      NOTE: Only the background script ever calls these action creators.
 *      Popup and content scripts may call actions indirectly by sending message
 *      to the background script which calls the action
 * @module actions
 *
 */
import logger from '../logger.js';
import sendMessageToContentScript from '../browser-specific/send-message-to-content.js';

/**
 *
 * ACTIONS
 *
 */
/**
 * Global state update
 */
export const SET_STATE = 'SET_STATE';
export function setState (state) {
    return { type: SET_STATE, state: state };
}
export const SET_STATE_EMBED = 'SET_STATE_EMBED';
export function setStateEmbed (slug, isOpen) {
    return { 
        type: SET_STATE_EMBED,
        slug: slug,
        isOpen: isOpen
    };
}
export const SET_INITIAL_STATE = 'SET_INITIAL_STATE';
export function setInitialState (state) {
    return { type: SET_INITIAL_STATE, state: state };
}


export const SET_TOTAL_ONLINE_USERS_COUNT = 'SET_TOTAL_ONLINE_USERS_COUNT';
export function setTotalOnlineUsersCount (count) {
    return { type: SET_TOTAL_ONLINE_USERS_COUNT, count: count };
}

export const SET_NOTIFICATIONS_ALWAYS_SEND = 'SET_NOTIFICATIONS_ALWAYS_SEND';
export function setNotificationsAlwaysSend(){
    return { type: SET_NOTIFICATIONS_ALWAYS_SEND };
}

export const SET_IS_FIRST_INSTALL = 'SET_IS_FIRST_INSTALL';
export function setIsFirstInstall (isFirstInstall) {
    return { type: SET_IS_FIRST_INSTALL, isFirstInstall: isFirstInstall};
}

export const SET_FORCE_REDDIT_REDIRECT_TO_CARROT_LOADING = 'SET_FORCE_REDDIT_REDIRECT_TO_CARROT_LOADING';
export function setForceRedditRedirectToCarrotLoading (value) {
    return { type: SET_FORCE_REDDIT_REDIRECT_TO_CARROT_LOADING, value: value};
}

/**
 * Identity
 */
export const GENERATE_ID = 'GENERATE_ID';
export function generateId () { return { type: GENERATE_ID }; }
export const SET_USERNAME = 'SET_USERNAME';
export function setUsername (username) {
    return { type: SET_USERNAME, username: username };
}

/**
 * Initial setup
 */
export const CLEAR_LOCAL_NOTIFICATIONS = 'CLEAR_LOCAL_NOTIFICATIONS';
export function clearLocalNotifications () {
    return { type: CLEAR_LOCAL_NOTIFICATIONS };
}

export const SET_INITIAL_NOTIFICATIONS_FROM_LOCAL_STORE = 'SET_INITIAL_NOTIFICATIONS_FROM_LOCAL_STORE';
export function setInitialNotificationsFromLocalStore (notifications) {
    return {
        type: SET_INITIAL_NOTIFICATIONS_FROM_LOCAL_STORE,
        notifications: notifications
    };
}

/**
 * NOTIFICATION sending settings
 */
export const CHANGE_BROWSER_NOTIFICATION_SEND_SETTING = 'CHANGE_BROWSER_NOTIFICATION_SEND_SETTING';
export function changeBrowserNotificationSendSetting (alwaysSend) {
    return {
        type: CHANGE_BROWSER_NOTIFICATION_SEND_SETTING,
        alwaysSend: alwaysSend
    };
}


/**
 * Keep track of tab
 */
export const SET_CARROT_TAB_STATE = 'SET_CARROT_TAB_STATE';
export function setCarrotTabState (options) {
    options = options || {};
    return { type: SET_CARROT_TAB_STATE, options: options };
}

/**
 * Popup / Chrome extension states
 */
export const CHROME_POPUP_OPEN = 'CHROME_POPUP_OPEN';
export function chromePopupOpen () {
    return { type: CHROME_POPUP_OPEN };
}

export const CHROME_POPUP_CLOSE = 'CHROME_POPUP_CLOSE';
export function chromePopupClose () { return { type: CHROME_POPUP_CLOSE }; }

/**
 * Login Flow
 *
 */
export const LOGIN_FLOW_REDDIT_NO_LOGIN = 'LOGIN_FLOW_REDDIT_NO_LOGIN';
export function loginFlowRedditNoLogin () { return { type: LOGIN_FLOW_REDDIT_NO_LOGIN }; }
export const LOGIN_FLOW_REDDIT_HAS_LOGIN_NO_CARROT = 'LOGIN_FLOW_REDDIT_HAS_LOGIN_NO_CARROT';
export function loginFlowRedditHasLoginNoCarrot () {
    return { type: LOGIN_FLOW_REDDIT_HAS_LOGIN_NO_CARROT };
}
export const LOGIN_FLOW_COMPLETE = 'LOGIN_FLOW_COMPLETE';
export function loginFlowComplete (options) {
    options = options || {};
    // let content script know
    sendMessageToContentScript({
        messageType: 'loginFlow:success',
        username: options.username
    });
    return { type: LOGIN_FLOW_COMPLETE, username: options.username };
}
export const LOGIN_FLOW_REDDIT_FAILED_TO_LOGIN = 'LOGIN_FLOW_REDDIT_FAILED_TO_LOGIN';
export function loginFlowRedditFailedToLogin () {
    sendMessageToContentScript({ messageType: 'loginFlow:fail' });
    return { type: LOGIN_FLOW_REDDIT_FAILED_TO_LOGIN };
}

export const LOGIN_FLOW_CARROT_FAILED_TO_LOGIN = 'LOGIN_FLOW_CARROT_FAILED_TO_LOGIN';
export function loginFlowCarrotFailedToLogin (options) {
    options = options || {};
    sendMessageToContentScript({ messageType: 'loginFlow:fail' });
    return { type: LOGIN_FLOW_CARROT_FAILED_TO_LOGIN, username: options.username };
}

/**
 * Account / carrot disconnect error
 */
export const DISCONNECT_ERROR_511 = 'DISCONNECT_ERROR_511';
export function disconnectError511 (isConnected) {
    return { type: DISCONNECT_ERROR_511 };
}


/**
 *
 * Unread
 *
 */
export const CLEAR_UNREAD_COUNT_FOR_SLUG = 'CLEAR_UNREAD_COUNT_FOR_SLUG';
export function clearUnreadCountForSlug (slug) {
    return { type: CLEAR_UNREAD_COUNT_FOR_SLUG, slug: slug };
}
export const UPDATE_ROOM_STATE_FROM_SERVER = 'UPDATE_ROOM_STATE_FROM_SERVER';
export function updateRoomStateFromServer (roomsBySlug) {
    return { type: UPDATE_ROOM_STATE_FROM_SERVER, roomsBySlug: roomsBySlug };
}

/**
 * Unread Counts / behavior for checking user logged in state
 */
export const NOTIFICATION_ADD_MULTIPLE_FROM_SERVER = 'NOTIFICATION_ADD_MULTIPLE_FROM_SERVER';
export function notificationAddMultipleFromServer (options) {
    options.type = NOTIFICATION_ADD_MULTIPLE_FROM_SERVER;
    return options;
}
export const NOTIFICATION_READ = 'NOTIFICATION_READ';
export function notificationRead (notificationId) {
    return { type: NOTIFICATION_READ, notificationId: notificationId };
}
export const NOTIFICATION_READ_ALL = 'NOTIFICATION_READ_ALL';
export function notificationReadAll () {
    return { type: NOTIFICATION_READ_ALL };
}
export const NOTIFICATION_DELETE = 'NOTIFICATION_DELETE';
export function notificationDelete (notificationId) {
    return { type: NOTIFICATION_DELETE, notificationId: notificationId };
}
