/**
 * Opens or access a page on carrot
 *
 * @module open-or-access-carrot-page
 */
import logger from '../logger.js';
import CONFIG from '../config.js';
import * as tabs from '../browser-specific/tabs.js';
import sendMessageToContentScript from '../browser-specific/send-message-to-content.js';


export default function openOrAccessCarrotPage (url, callback) {
    callback = callback || function () {};

    tabs.fetchTabsForDomain(CONFIG.carrotUrl, (err, res) => {
        // If not found, open new tab
        if (!res || (res && res.length < 1)){
            logger.log('openOrAccessCarrotPage:no-carrot-tab-found',
            'could not find carrot. Opening page:' + url, res);

            tabs.createTab({url: CONFIG.carrotUrl + url.replace(/^\//, '')});
            return true;
        }

        // if found, redirect
        tabs.updateTab(res[0].id, {
            highlighted: true
        }, (tab) => {
            logger.log('openOrAccessCarrotPage:accessingPage',
            'accessing page with url: ' + url);

            sendMessageToContentScript({
                messageType: 'changeLocation',
                location: url
            });

            callback();
        });
    });
}
