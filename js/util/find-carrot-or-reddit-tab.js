/**
 * Determines if a carrot or reddit is tab is open
 *
 * @module find-carrot-or-reddit-tab
 */
import logger from '../logger.js';
import async from 'async';
import CONFIG from '../config.js';
import * as tabs from '../browser-specific/tabs.js';

export default function findCarrotOrRedditTab (callback) {
    callback = callback || function () {};

    var foundReddit = false;
    var foundCarrot = false;

    // fetch tabs
    async.parallel([
        function (cb) {
            tabs.queryTab({ url: CONFIG.carrotUrl }, function(foundTabs){
                if (foundTabs.length > 0) { foundCarrot = true; }
                cb();
            });
        },
        function (cb) {
            tabs.queryTab({ url: '*://*.reddit.com/*' }, function(foundTabs){
                if (foundTabs.length > 0) { foundReddit = true; }
                cb();
            });
        }
    ],
    function allDone () {
        if (foundReddit || foundCarrot) { return callback(null, true); }
        else { return callback(null, false); }
    });
}
