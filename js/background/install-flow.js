/**
 * Functionality for first time installs
 *
 * @module background/install-flow
 */
import _ from 'lodash';
import logger from '../logger.js';
import CONFIG from '../config.js';
import * as tabs from '../browser-specific/tabs.js';

import store from '../store/store.js';
import * as ACTIONS from '../store/actions.js';

/**
 *
 * UTIL
 *
 */

/**
 * called to open the proper carrot tab so multiple, unnecessary tabs 
 * are not created
 * @function setActiveCarrotTab
 */
export function setActiveCarrotTab (options, callback) {
    options = options || {};
    callback = callback || function () {};

    logger.log('setActiveCarrotTab:called',
    'called with ', options);

    // fetch the active tab to see if we're already on a carrot tab
    return tabs.fetchActiveTab(function gotActiveTab (err, tab) {
        tab = tab || {windowId: 1, url: ''};

        var activeWindowId = tab.windowId;
        logger.log('setActiveCarrotTab:called', 'on url: ' + tab.url);

        // If the ACTIVE tab is already on carrot, change the URL
        if (('' + tab.url).indexOf(CONFIG.carrotUrl) === 0 &&
        ('' + tab.url).indexOf(CONFIG.carrotUrl + 'api/') === -1) {
            logger.log('setActiveCarrotTab:called', 'tab already open %j', tab); 

            // send message to change URL
            chrome.tabs.sendMessage(tab.id, {
                messageType: 'changeLocation',
                location: options.url
            }, function() {});

            // Do nothing - we're done!
            return callback(null, {success: true});

        } else {
            // Attempt to find the first carrot tab
            return tabs.fetchTabsForDomain(CONFIG.carrotUrl, (err, res) => {
                // No tab found for domain? create one
                if (!res){
                    tabs.createTab({url: options.url});
                    return callback(null, {success: true, openedUrl: true});
                }

                // otherwise, maybe we found multiple tabs on multiple
                // windows. Set active tab for current window and close
                // all others
                var targetTabIdToActivate = null;

                // Close ALL tabs for carrot except the first one
                // we find open in the current window. This is done to
                // prevent edge cases of users having a bunch of open
                // carrot tabs
                if (options.doNotCloseTabs !== true) {
                    var tabsToClose = _.map(res, (curTab) => {
                        if (curTab.windowId === activeWindowId && !targetTabIdToActivate){
                            targetTabIdToActivate = curTab.id;
                            return false;
                        }
                        return curTab;
                    });
                    _.each(tabsToClose, (curTab) => {
                        logger.log('install-flow:setActiveCarrotTab:removeTab',
                            'removing tab');
                        if (curTab){ tabs.removeTab(curTab.id); }
                    });

                    if(options.onlyCloseTabs){
                        // If we *only* wanted to close all active carrot tabs,
                        // return here
                        return callback(null, {success: true});
                    }
                }

                // If we haven't found a tab to activate in the current
                // window, create one
                if (targetTabIdToActivate) {
                    tabs.setActiveTab(targetTabIdToActivate);
                    if (options.url) {
                        chrome.tabs.update(targetTabIdToActivate, {
                            url: options.url
                        });
                    }
                    return callback(null, {success: true});

                } else {
                    tabs.createTab({url: options.url});
                    return callback(null, {success: true, openedUrl: true});
                }
            });
        }
    });
}

/**
 *
 * Main functionality
 *
 */
export default function installFlow (details) {
    const thisVersion = chrome.runtime.getManifest().version;

    // ensure alwaysSend is defaulted to true
    store.dispatch(ACTIONS.setNotificationsAlwaysSend());
}
