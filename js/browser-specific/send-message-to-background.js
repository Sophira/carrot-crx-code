/**
 * Sends a message to the background worker
 *
 * @module send-message-to-background
 */

export default function sendMessageToBackend (options){
    chrome.runtime.sendMessage(options);
}
