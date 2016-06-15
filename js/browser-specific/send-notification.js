/**
 * Create notifications using browser API
 *
 * @module notifications
 */

/**
 * Create notification
 */
export default function createNotification (options, callback) {
    options = options || {};
    callback = callback || function () {};

    // For chrome: https://developer.chrome.com/apps/notifications#method-create
    if(chrome && chrome.notifications){
        // set ID to an empty string to clear out existing notifications
        chrome.notifications.create('', options, callback);
    }
}
