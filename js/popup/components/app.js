/**
 *
 * app.js
 *      Main app handler component
 * @module popup/components/app
 *
 */
/**
 * dependencies
 */
import _ from 'lodash';
import {connect} from 'react-redux';
import logger from '../../logger.js';
import React, {Component, PropTypes} from 'react';

import d3 from 'd3';
import $ from 'jquery';
import async from 'async';
import CONFIG from '../../config.js';
import UnreadByRoom from './unread-by-room.js';
import * as ACTIONS from '../../store/actions.js';

const manifest = require('json!../../../manifest.json');
const CARROT_EXTENSION_VERSION = manifest.version;

/**
 *
 * functionality
 *
 */
var App = React.createClass({
    /**
     * returns initial component state. This is the root level component,
     * which will render subcomponents based on if the user is logged in
     */
    getInitialState: function getInitialState () {
        return {
            removeConfirm: false,
            settingsOpened: false,
            isLoggedInToReddit: null,
            isLoggedInToCarrot: null,
            loading: true
        };
    },

    /**
     * lifecycle events
     */
    componentDidMount: function componentDidMount () {
        logger.log('components/app:componentDidMount', 'called');
    },

    /**
     * Event responder
     */
    redditLoginClicked: function redditLoginClicked () {
        // open reddit login page
        chrome.runtime.sendMessage({ messageType: 'openRedditLoginPage' });
    },
    openCarrot: function openCarrot (){
        chrome.runtime.sendMessage({ messageType: 'openCarrot' });
    },
    logout: function () {
        chrome.runtime.sendMessage({ messageType: 'logout' });
    },
    openRedditOauth: function () {
        chrome.runtime.sendMessage({ messageType: 'redditLogin' });
    },

    /**
     * called to toggle popups
     */
    showSettingsPopup: function showSettingsPopup () {
        this.setState({ settingsOpened: !this.state.settingsOpened });
    },

    updateNotificationSetting: function updateNotificationSetting (key) {
        // NOTE: Not implemented yet
        let newNotifSettings = _.clone(this.props.app.allowedNotificationTypes || []);

        // add or remove item
        let index = newNotifSettings.indexOf(key);
        if (index === -1) { newNotifSettings.push(key); }
        else { newNotifSettings.splice(index, 1); }

        // NOTE: could use props instead of state here
        // toggle chrome state
        chrome.runtime.sendMessage({ 
            messageType: 'setState', 
            state: {allowedNotificationTypes: newNotifSettings}
        });
    },

    /**
     * hides carrot icon from browser tab
     */
    toggleExtensionHiddenState: function toggleExtensionHiddenState () {
        chrome.runtime.sendMessage({ messageType: 'toggleExtensionHiddenState' });
        if (!!!this.props.app.extensionIsHidden) {
            setTimeout(function () { window.close(); }, 30);
        }
    },

    /**
     * Renders footer area
     */
    renderFooter: function () {
        /**
         * MARKUP FOR BUTTON:
        */
        let carrotTrashClass = 'remove-carrot__trash-can ';
        if (this.props.app.extensionIsHidden) {
            carrotTrashClass += ' selected';
        }

        let removeText = 'Hide Carrot from Chrome Bar';
        if (this.state.removeConfirm) {
            removeText = (
                <span>
                    Are you sure you?
                    <span style={{
                            cursor: 'pointer', 
                            padding: '0 6px 0', 
                            margin: '0 0px 0 -2px',
                            position: 'absolute',
                            right: '-33px'
                        }}
                        onClick={this.toggleExtensionHiddenState}>
                        Yes
                    </span>
                    <span style={{
                            cursor: 'pointer',
                            padding: '0 2px 0 11px',
                        }}
                        onClick={() => {
                            this.setState({removeConfirm: false});
                        }}>
                        No
                    </span>
                </span>
            );
        }

        if (this.props.app.extensionIsHidden) {
            removeText = 'Unhide extension';
        }

        let displayHideButton = true;
        if (this.state.removeConfirm === true) {
            displayHideButton = false;
        }

        let version = CARROT_EXTENSION_VERSION;

        return (
             <div className='notifications-footer'>
                <span className='carrot-v'
                    style={{
                        fontSize: '0.9em',
                        position: 'absolute',
                        left: '8px',
                        bottom: '10px',
                        color: '#cdcdcd'
                    }}>
                    v{version}
                </span>

                <span className='remove-carrot'>
                    {removeText}
                </span>
                <img 
                    style={{
                        display: displayHideButton ? 'block' : 'none'
                    }}
                    onClick={() => {
                        if (this.props.app.extensionIsHidden) {
                            this.toggleExtensionHiddenState();
                        } else if (this.state.removeConfirm === false) {
                            this.setState({removeConfirm: true});
                        } else {
                            this.setState({removeConfirm: false});
                        }
                    }}
                    className={carrotTrashClass}
                    src={`https://carrot-prod-assets.s3.amazonaws.com/svg/icon__trash.svg`} />
             </div>
        );
    },

    /**
     * Render the whole app.
     * Ideally, all the sub html (e.g., logged out view), should be placed 
     * in their own method and called
     * @method render
     */
    render: function render(){
        logger.log('components/app:render', 'called: state: ', this.state, this.props);

        /** Pre data view. Before state is retrieved from background tab, the
         * default store state's `isPopupOpen` is false, so this view doesn't
         * know that it's been opened yet. Show a blank / loading / pre-data
         * flow which is replaced when the popup store is updated */
        if (!this.props.app.isPopupOpen) {
            return (
                <div className='popup__pre-render'>
                    {this.renderFooter()}
                </div>
            );
        }

        /** LOGGED OUT view */
        if (!this.props.app.username) {
            return (
            <div className='oauth__container'>
                <div className='oauth__content'>

                    <div className='oauth__carrot-typeface'>
                        <img src='https://carrot-prod-assets.s3.amazonaws.com/svg/icon__carrot-oauth.svg' />
                    </div>

                    <div onClick={this.openRedditOauth} className='oauth__button'>
                        <span className='oauth__button-wrapper'>
                            <span className='lock'></span>
                            Sign in to reddit
                        </span>
                    </div>

                </div>

                {this.renderFooter()}
            </div>
            );
        }

        /** Logged in view */
        let popupHtml = '';
        // Note: user can be logged into carrot but does not need to be logged
        // into reddit
        let alwaysSendNotifications = this.props.app.notificationSendSettings.alwaysSend;

        let checkedItems = {
            'hot': (this.props.app.allowedNotificationTypes || []).indexOf('hot') > -1,
            'mention': (this.props.app.allowedNotificationTypes || []).indexOf('mention') > -1,
            'newRoom': (this.props.app.allowedNotificationTypes || []).indexOf('newRoom') > -1
        };

        let settingsHtml = (
            <div className={'notifications-settings__wrapper ' + (this.state.settingsOpened ? 'opened' : '')}>
                <div className='notifications-settings__wrapper-inner'>

                    <div className='notification-settings__item-browser-settings'>
                        <div className='notification-settings__item-browser-settings-header'>
                            Notify me when
                        </div>

                        <div className={'notification-settings__item-browser-notify-item ' + (checkedItems.mention ? 'checked' : '')}
                            onClick={() => { this.updateNotificationSetting('mention'); }} >
                            
                            <div className='notification-settings__item-text'>
                                Someone mentions me
                            </div>
                            <div className='notification-settings__item-left-gutter'>
                                <input type='checkbox' name='settings-browser-state'
                                    readOnly
                                    checked={checkedItems.mention} />
                            </div>
                            <div className='clear'></div>
                        </div>

                        <div className={'notification-settings__item-browser-notify-item ' + (checkedItems.newRoom ? 'checked' : '')}
                            onClick={() => { this.updateNotificationSetting('newRoom'); }} >
                            
                            <div className='notification-settings__item-text'>
                                New rooms are created
                            </div>
                            <div className='notification-settings__item-left-gutter'>
                                <input type='checkbox' name='settings-browser-state'
                                    readOnly
                                    checked={checkedItems.newRoom} />
                            </div>
                            <div className='clear'></div>
                        </div>
                    </div>

                    <div className='notification-settings__item-logout'
                        onClick={this.logout}>
                        <div className='notification-settings__item-text-logout'>
                            Log out
                        </div>
                    </div>
                </div>
            </div>
        );

        /**
         * Render
         */
        // This is just a single component / state, so send over all store data
        return (
            <div className='wrapper-logged-in__main'>
                <div className='notifications-header'>
                    <div className='notifications-header__title'>
                        <img src='https://carrot-prod-assets.s3.amazonaws.com/svg/icon__typeface-grey.svg'
                            onClick={this.openCarrot}
                            className='users-online__icon'
                            style={{marginLeft: '-45px'}}
                            width='100px' height='20px'
                        />
                    </div>
                    <div className='notifications-header__username'
                        onClick={this.showSettingsPopup} >

                        <span className='notification-header__uesrname'>
                            <img className='green-dot' src={`https://carrot-prod-assets.s3.amazonaws.com/svg/icon__green-dot.svg`}/>
                            {this.props.app.username}
                        </span>

                        <span className='notifications-header__text'>
                            <img className='setting-gear' src={`https://carrot-prod-assets.s3.amazonaws.com/svg/icon__settings.svg`}/>
                        </span>
                    </div>
                </div>

                <UnreadByRoom data={this.props.app}
                    dispatch={this.props.dispatch} />

                {settingsHtml}

                {this.renderFooter()}
            </div>

        );
    }
});

/**
 * configure select function and connect to redux
 */
function select(state) {
    logger.log('components/app:select', 'called: ', state);
    return { app: state.app };
}
export default connect(select)(App);
