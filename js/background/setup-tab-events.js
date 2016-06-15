/**
 * Sets up tab events for keeping track if Carrot is open, closed, or active
 *
 * @module background/setup-tab-events
 *
 */
import CONFIG from '../config.js';
import logger from '../logger.js';
import store from '../store/store.js';
import * as ACTIONS from '../store/actions.js';
import * as tabs from '../browser-specific/tabs.js';

/**
 *
 * Util
 *
 */
/**
 * Track tab state. Get all tab status
 */
function checkTabsState () {
    tabs.fetchTabsForDomain(CONFIG.carrotUrl, (err, res) => {
        if (!res || (res && res.length < 1)){
            logger.log('tab-tracking:no-carrot-tab-found', 'could not find carrot', res);
            // if tab is NOT open, it cannot be active, so return here
            store.dispatch(ACTIONS.setCarrotTabState({
                open: false, active: false
            }));
            return false;
        }

        // Check if the active tab is carrot. Open is `true` is this point
        tabs.fetchActiveTab((err, tab) => {
            if(err || !tab || (tab && !tab.url)){
                store.dispatch(ACTIONS.setCarrotTabState({
                    active: false, open: true
                }));
            }

            // need this redundant check because chrome sometimes blows up here
            if (tab && tab.url && ('' + tab.url).indexOf(CONFIG.carrotUrl) > -1) {
                store.dispatch(ACTIONS.setCarrotTabState({
                    active: true, open: true
                }));

                /* DEPRECATED - Do NOT close multiple carrot tabs
                // remove any other carrot tabs
                removeOtherCarrotTabs();
                */

            } else {
                store.dispatch(ACTIONS.setCarrotTabState({
                    active: false, open: true
                }));
            }
        });
    });
}

/**
 * DEPRECATED
 * Removes all other carrot tabs, to ensure only 1 tab stays open
 */
export function removeOtherCarrotTabs () {
    logger.log('removeOtherCarrotTabs', 'called');
    tabs.fetchTabsForDomain(CONFIG.carrotUrl, (err, res) => {
        // If not found, open new tab
        if (!res || (res && res.length < 1)){
            logger.log('notification-item-clicked:no-carrot-tab-found',
            'could not find carrot', res);
            return false;
        }

        tabs.fetchActiveTab((err, tab) => {
            // Close other tabs
            for (var i = 0; i < res.length; i++) {
                if (tab.id !== res[i].id) {
                    tabs.removeTab(res[i].id);
                }
            }
        });
    });
}

/**
 *
 * Functionality
 *
 */
export default function setupCarrotTabTracking () {
    /*
     * CURRENT, initial state
     */
    checkTabsState();

    // When a tab is updated (opened OR the url changes for the current tab),
    // update state
    chrome.tabs.onUpdated.addListener((id, changeInfo, tab) => {
        logger.log('tab-tracking:onupdated', 'updated tab', tab);
        // call only immediately when loading to check if it's carrot or not
        if(tab.status === 'loading'){ checkTabsState(); }
    });

    // when a tab is activated, it means the user has switched to a new tab
    chrome.tabs.onActivated.addListener((activeInfo) => {
        if (activeInfo && activeInfo.tabId) {
            try {
                chrome.tabs.get(activeInfo.tabId, (tab) => {
                    logger.log('tab-tracking:onActivated', 'activated tab', tab);
                    checkTabsState();
                });
            } catch (err) {
                logger.log('tab-tracking:onActivated',
                'could not get tab : ' + err);
            }
        }
    });
}
