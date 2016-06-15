/**
 * Sends a message to the current tab, which will be picked up by any running
 * content scripts
 *
 * @module send-message-to-content
 */

export default function sendMessageToContentScript (options, callback) {
    options = options || {};
    callback = callback || function () {};

    // send message to active tab
    chrome.tabs.query({}, function (tabs) {
        for (var i = tabs.length - 1; i >= 0; i--) {
            chrome.tabs.sendMessage(tabs[i].id, options, function (response) {
                callback(null, response);
            });
        }
    });
}
