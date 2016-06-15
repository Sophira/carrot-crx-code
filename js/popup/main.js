/**
 * Main entrypoint for the popup script
 *
 * @module popup/main.js
 */
import '../../css/main.scss';

/**
 *
 * dependencies
 *
 */
import logger from '../logger.js';
import _ from 'lodash'; window._ = _;
import $ from 'jquery'; window.$ = $;

import React from 'react';
import ReactDOM from 'react-dom';
import store from '../store/store.js';
import App from './components/app.js';
import { Provider } from 'react-redux';
import * as ACTIONS from '../store/actions.js';

/**
 *
 * functionality
 *
 */
logger.log('main', 'initializing');

/**
 * Main bootstrap flow. Get current app state (on every popup open), then show
 * the popup
 */
chrome.runtime.sendMessage({ messageType: 'getState', fromPopup: true }, function (res) {
    // set the _local_ popup store state which was retrieved from the background
    // store's state. This ensures a single source of app truth (the background
    // script)
    store.dispatch(ACTIONS.setState(res.app));

    // inform background that popup is open
    chrome.runtime.sendMessage({
        messageType: 'action',
        action: ACTIONS.chromePopupOpen()
    });
    chrome.runtime.sendMessage({messageType: 'updateNotificationLastReadDate'});

    // After getting initial state, listen for all future state changes
    chrome.runtime.onMessage.addListener(function gotMessage (message, sender, sendResponse) {
        logger.log('popup/chrome.onMessage', 'got message: ', message);

        if(message.messageType && message.messageType === 'setState'){
            logger.log('popup/chrome.onMessage', 'setting state');
            store.dispatch({ type: 'SET_STATE', state: message.state });
        }
    });

    // immediately update notifications
    chrome.runtime.sendMessage({
        messageType: 'fetchAndUpdateNotifications',
        options: { wasCalledFromPopup: true }
    });

    // let carrot backend know the extension's popup is open, which enables
    // us to know that the client is active
    chrome.runtime.sendMessage({
        messageType: 'analytics:send',
        group: 'popup:opened'
    }, function () {});

});

/*
 * render popup
 */
ReactDOM.render(
    <div className='app'>
        <Provider store={store}>
            <App />
        </Provider>
    </div>,
    document.getElementById('app-wrapper')
);

/**
 * When window closes, inform background
 */
addEventListener("unload", function (event) {
    chrome.runtime.sendMessage({
        messageType: 'action',
        action: ACTIONS.chromePopupClose()
    });
}, true);
