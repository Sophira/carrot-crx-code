/**
 * sets up the background notification / unread messages fetcher
 *
 * @module background/setup-notification-fetcher.js
 *
 */
import logger from '../logger.js';
import fetchAndUpdateNotifications from '../util/fetch-notifications.js';

/**
 *
 * Setups notification fetcher using chrome alarms to fetch unread messages 
 * every minute
 * @function setupNotificationFetcher
 *
 */
export default function setupNotificationFetcher () {
    //// Clear all existing listeners
    chrome.alarms.clearAll();

    // setup alarm handler
    chrome.alarms.onAlarm.addListener(function gotAlarm (alarm) {
        logger.log('notificationFetcher:alarm', 'got alarm', alarm);
        if(alarm.name === 'fetchNotifications'){ fetchAndUpdateNotifications(); }
    });

    // This creates a new alarm to trigger in the future. The alarm handler
    // called this fetchAndSetAlarm function, which is how this stays alive
    chrome.alarms.create('fetchNotifications', { periodInMinutes: 1 });

    // setup alarm immediately
    fetchAndUpdateNotifications();
}
