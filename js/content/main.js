/**
 *
 * content.js
 *      Main content script, run on reddit.com to insert the carrot chat
 *      container
 * @module content/main
 *
 */
import '../../css/main-content-script.scss';

/**
 * dependencies
 */
import $ from 'jquery';
import CONFIG from '../config.js';

// don't include logger here
//import logger from '../logger.js';
let logger = {log: function() {}};

import mainReddit from './main-reddit.js';
import mainCarrot from './main-carrot.js';

/**
 * Functionality
 */
//logger.log('carrot-chrome-extension', 'The Yamato is loaded and so am I...', window.location.host);

/**
 *
 * Content Script flow
 *
 */
var setupTimeout;
var wasSetup = false;

function setup () {
    clearTimeout(setupTimeout);

    // attempt to inject our embed immediately once the body is available
    if($('body').length !== 1){
        return setTimeout(() => {
            clearTimeout(setupTimeout);
            setupTimeout = setTimeout(setup, 16);
        }, 50);
    }

    // ensure we don't set it up multiple times
    if (wasSetup === true) { return false; }
    wasSetup = true;

    // Add body class for css depending on page
    if (window.location.host.match(/reddit\.com/)) {
        mainReddit();

    } else if (window.location.host.match(CONFIG.carrotUrl
        .replace('https://', '') // remove  initial https://
        .replace(/\/$/, '') // remove trailing slash
    )) {
        mainCarrot();
    }
}

// inject as soon as we can
setupTimeout = setTimeout(setup, 16);

// Redirect immediately if on oauth to use the "full" oauth page, NOT the compact
// oauth page. It's the same oauth flow, but for web we want to show the full
// page
let windowLocation = decodeURIComponent('' + window.location.href);

if (
    windowLocation.indexOf('https://ssl.reddit.com/api/v1/authorize.compact') === 0 &&
    (
        windowLocation.indexOf('redirect_uri=https://carrot.com') > -1 ||
        windowLocation.indexOf('redirect_uri=https://localhost:5443') > -1
    )
) {
    $('body').css({ display: 'none' });
    window.location = windowLocation.replace(/authorize.compact/, 'authorize');
}
