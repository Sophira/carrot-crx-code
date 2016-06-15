/**
 * Main badge setting util
 * @module set-badge
 *
 */

/**
 *
 * CONFIG
 *
 */
let SET_BADGE_FOR_NOTIFICATION = false;

var NOTIFICATION_COLORS = {
    red: [251, 58, 48, 255],
    yellow: [205, 205, 0, 255],
    green: [10, 255, 10, 255],
    gray: [150, 150, 150, 150],
    blue: [150, 200, 255, 255],
    alphaBlue: [150, 200, 255, 80]
};

/**
 * sets the badge and badge background color
 * @param {String} text - text to display. Gets truncated if it is too log
 * @param {String | Array} backgroundColor - either a string (which is a key in
 *      NOTIFICATION COLORS) or an array of colors
 */
/**
 * called by background to set the badge based on state
 */
export function setBadge (text, backgroundColor) {
    if(typeof backgroundColor === 'string'){
        backgroundColor = NOTIFICATION_COLORS[backgroundColor];
    }

    chrome.browserAction.setBadgeText({text: '' + text});
    if(backgroundColor){
        chrome.browserAction.setBadgeBackgroundColor({ color: backgroundColor });
    }
}

/**
 *
 * Util
 *
 */
/**
 * If user needs to login, show login badge
 */
export function badgeStateLogin (state) {
    // For badge login state, never show anything
    if (!state.isLoggedIntoCarrot) {
        state.badgeText = '';

        if(!state.isLoggedIntoReddit) {
            // logged into carrot, but not reddit
            state.badgeText = '';
        }
    }
    return state;
}

/**
 * If there are no notifications, clear out the badge
 */
export function badgeStateEmpty (state) {
    state.badgeText = '';
    state.badgeBackgroundColor = 'green';

    //// with dot
    //state.badgeText = ' • ';
    //state.badgeBackgroundColor = 'alphaBlue';

    return state;
}
export function setBadgeBasedOnState (state) {
    state.badgeText = '' + +(state.badgeCount || 0);
    state.badgeBackgroundColor = 'gray';

    if (!state.badgeCount) { state.badgeText = ''; }

    // if user was mentioned, set color
    if (state.hasMention && state.badgeCount > 0) {
        state.badgeBackgroundColor = 'red';
    }

    // check for new notifications
    if (!state.isPopupOpen) { 
        // if found, change badge and set unread count
        state.badgeText = '' + +(state.badgeCount || 0);
    }

    // ensure login badge state is set
    badgeStateLogin(state);

    if (state.extensionIsHidden) { 
        // always set badge text to nothing when extension is hidden
        state.badgeText = '';
    }

    // NOTE: If badge count is 0, we don't need to show it
    if (+state.badgeText === 0) { state.badgeText = ''; }

    // set badge
    setBadge(state.badgeText, state.badgeBackgroundColor);

    return state;
}
