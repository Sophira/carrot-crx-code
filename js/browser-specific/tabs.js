/**
 * Fetches information on the currently open tabs
 *
 * NOTE: We can sendMessage to a tab and have our content script listen for 
 * message
 *
 *
 * @module fetch-tabs
 */
import _ from 'lodash';
import logger from '../logger.js';

/**
 *
 * TAB Fetching
 *
 */
/**
 * fetches and returns all currently open tabs
 */
export function fetchTabs (callback) {
    callback = callback || function () {};

    var currentWindowId = null;
    var focusedWindowId = null;

    chrome.windows.getCurrent(function getCurrentTabs (currentWindow) {
        currentWindowId = currentWindow.id;

        chrome.windows.getLastFocused(function getLastFocued (focusedWindow) {
            focusedWindowId = focusedWindow.id;
            chrome.windows.getAll({ populate: true }, function getAllTabs (windowList) {
                var tabs = {};
                var tabIds = [];
                for (var i = 0; i < windowList.length; i++) {
                    windowList[i].current = (windowList[i].id === currentWindowId);
                    windowList[i].focused = (windowList[i].id === focusedWindowId);

                    for (var j = 0; j < windowList[i].tabs.length; j++) {
                        tabIds[tabIds.length] = windowList[i].tabs[j].id;
                        tabs[windowList[i].tabs[j].id] = windowList[i].tabs[j];
                    }
                }

                return callback(null, {
                    tabs: tabs,
                    tabIds: tabIds,
                    currentWindowId: currentWindowId,
                    focusedWindowId: focusedWindowId
                });
            });
        });
    });
}

/**
 * fetches all tabs for target domain
 */
export function fetchTabsForDomain (domain, callback) {
    var foundTab = null;

    fetchTabs(function gotTabs (err, tabs) {
        if(err || !tabs || !tabs.tabs){ return callback(err, null); }

        var foundTabs = [];

        for(let key in tabs.tabs){
            if(tabs.tabs[key].url.indexOf(domain) === 0){
                foundTabs.push(tabs.tabs[key]);
            }
        }

        return callback(null, foundTabs);
    });
}

/**
 * Fetches the currently selected tab. Needed to determine if we should open
 * or switch to a new tab for carrot, or use the current one.
 */
export function fetchActiveTab (callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        return callback(null, tabs[0]);
    });
}

/**
 *
 * Tab Modification
 *
 */
/**
 * removes a passed in tabId
 */
export function removeTab (tabId, callback) {
    logger.log('tabs/removeTab', 'removing tab called : ' + tabId);
    callback = callback || function () {};
    // tab *may* be removed at this point
    try {
        chrome.tabs.remove(tabId, callback);
    } catch (err) {}
}

/**
 * create tab
 */
// store tab creation dates so we don't create too many
let lastTabCreatedDate = new Date(2015);
let tabsCreated = 0; // reset over time
setInterval(function () {
    // reset every 60 seconds
    tabsCreated = 0;
}, 1000 * 60);

export function createTab (options, callback) {
    options = options || {};
    callback = callback || function () {};

    if (options.ignoreTabLimit !== true) {
        // if a tab was just recently created, do not create another one
        if ((new Date() - lastTabCreatedDate) < 200) { return false; }
        // don't create too many tabs
        if (tabsCreated > 5) { return false; }
    } 
    delete options.ignoreTabLimit;

    lastTabCreatedDate = new Date();
    tabsCreated++;

    chrome.tabs.create(options, callback);
}

/**
 * refresh tab
 */
export function reloadTab (tabId) {
    chrome.tabs.reload(tabId);
}


export function queryTab (query, callback) {
    callback = callback || function () {};
    chrome.tabs.query(query, callback);
}

/**
 * update tab
 * See: https://developer.chrome.com/extensions/tabs#method-update for propes
 * options
 */
export function updateTab (tabId, props, callback) {
    callback = callback || function () {};

    chrome.tabs.update(tabId, props, callback);
}

/**
 *
 * Marks a tab as active
 *
 */
export function setActiveTab (tabId, callback) {
    callback = callback || function () {};
    logger.log('tabs:setActiveTab', 'called with tabId: ' + tabId);

    chrome.tabs.update(tabId, {
        active: true, highlighted: true
    }, callback);
}
