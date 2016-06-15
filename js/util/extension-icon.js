/**
 *
 * Sets the extension icon based on hidden state
 *
 */
export default function setExtensionIconBasedOnHiddenState (isHidden) {
    if (isHidden) {
        chrome.browserAction.setIcon({
            path: 'img/icon-blank.png'
        });
    } else {
        chrome.browserAction.setIcon({
            path: 'img/icon.png'
        });
    }
}
