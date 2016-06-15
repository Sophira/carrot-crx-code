/**
 * Carrot analytics - used for the backend to know if a user is connected 
 * via the extension, has the extension open or closed / destroyed (so we can
 * show activity level)
 *
 * @module analytics
 */
import $ from 'jquery';
import uuid from 'uuid';
import CONFIG from '../config.js';
import logger from '../logger.js';
import store from '../store/store.js';

let VERSION = '0.0.0';
if (chrome && chrome.runtime && chrome.runtime.getManifest) {
    var manifest = chrome.runtime.getManifest();
    VERSION = manifest.version;
}

export default function sendAnalyticsMessage (options) {
    options.group = 'extension:' + options.group;
    options.version = VERSION;

    logger.log('analytics', 'called with ', options);

    // send analytics message
    $.ajax({
        url: CONFIG.carrotUrl + 'api/me/analytics',
        type: 'post',
        data: {
            generatedId: uuid.v4(),
            analytics: JSON.stringify(options)
        },
        success: () => {},
        error: () => {}
    });
}
