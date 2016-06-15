/**
 *
 * unread-by-room.js
 *  Lists unread by room info
 * @module popup/components/unread-byroom
 *
 */
/**
 * dependencies
 */
import $ from 'jquery';
import _ from 'lodash';
import async from 'async';
import moment from 'moment';
import logger from '../../logger.js';
import {connect} from 'react-redux';
import CONFIG from '../../config.js';
import React, {Component, PropTypes} from 'react';

import getPrettyDurationString from '../../util/get-pretty-duration.js';

import * as ACTIONS from '../../store/actions.js';
import processNotification from '../../util/process-notification.js';
import sendMessageToBackend from '../../browser-specific/send-message-to-background.js';

/**
 *
 * Individual unread room item
 * @class UnreadRoomItem
 *
 */
let UnreadRoomItem = React.createClass({
    clicked: function (slug, unreadCount) {
        chrome.runtime.sendMessage({ messageType: 'openCarrot', slug: slug });
        chrome.runtime.sendMessage({
            messageType: 'analytics:send',
            group: 'popup:unreadItem:clicked',
            unreadCount: unreadCount,
            routingKey: slug
        }, function () {});

        window.close();
    },

    render: function render(){
        let unreadBadge = '';
        let count = this.props.count || 0;
        if (count > 0) {
            unreadBadge = (
                <div className={'unread-item__count ' + (this.props.mentioned ? 'unread-item__count--mentioned' : '')}
                    style={{
                        width: count < 100 ? '16px' : 'auto',
                        padding: '2px',
                        minWidth: '13px'
                    }}>
                    {count > 99 ? '99+' : count}
                </div>
            );
        }

        /**
         * Setup last message
         */
        let lastMessage; 
        if (this.props.mentioned) {
            lastMessage = (
                <div className='unread__room-last-message unread__room-last-message-mentioned'>
                    You've been mentioned!
                </div>
            );

        } else {
            let message = ('' + (this.props.lastMessageMessage || '')).trim();
            if (message.length > 45) { message = message.substring(0, 42) + '...'; }

            lastMessage = (
                <div className={'unread__room-last-message ' + (this.props.mentioned ? 'unread__room-last-message-mentioned' : '')}>
                    <span className='unread__room-last-message-author'>
                        {this.props.lastMessageAuthor}
                    </span>
                    <span className='unread__room-last-message-content'>
                        {message}
                    </span>
                </div>
            );
        }

        // number of users online right now
        let onlineCount = '';
        if (!isNaN(this.props.numUsersOnline)) {
            onlineCount = (
                <div className='unread__room-online'>
                    <span className='unread__online-count'>{this.props.numUsersOnline}</span> online
                </div>
            );
        }

        // time ago
        let lastMessageAgo = '';
        if (this.props.lastMessageTimestamp) {
            lastMessageAgo = (
                <div className='unread__room-last-message-date'>
                    {getPrettyDurationString((Date.now() - this.props.lastMessageTimestamp) / 1000)}
                </div>
            );
        }

        // class for item
        let itemClassName = 'unread-item ';
        if (count < 1) { itemClassName += ' unread-item__stale'; } 
        else { itemClassName += ' unread-item__new'; }
        if (this.props.mentioned) { itemClassName += ' unread-item__mentioned'; }

        /**
         * Render it
         */
        return (
            <div className={itemClassName}
                onClick={() => {return this.clicked(this.props.slug, count); }}>
                <div className='unread__room-icon'
                    style={{
                        backgroundImage: 'url(https://carrot-prod-assets.s3.amazonaws.com/icons/' + this.props.slug.toLowerCase() + '.png),url(https://carrot-prod-assets.s3.amazonaws.com/img/carrot-default.png)'
                    }}>
                    {unreadBadge}
                </div>
                <div className='unread__room-info'>
                    <div className='unread__room-slug'>
                        {this.props.slug}
                    </div>
                    {onlineCount}

                    {lastMessage}

                    {lastMessageAgo}
                </div>
                <div className='clear'></div>
            </div>
        );
    }
});

/**
 *
 * View for collection of unread room items
 * @class UnreadByRoom
 *
 */
let UnreadByRoom = React.createClass({
    getInitialState: function getInitialState () {
        return { };
    },

    /**
     * lifecycle events
     */
    componentDidMount: function componentDidMount (){
        logger.log('components/unreadByRoom:componentDidMount', 'called');
    },

    /**
     * render
     * TODO : Set some initial state so we can show a loading notification message
     */
    render: function render(){
        logger.log('components/notifications:render', 'called', this.props);

        let groups = {
            mentions: [],
            counts: [],
            other: []
        };

        _.each(this.props.data.unreadByRoom, (d, key) => {
            let roomData = {room: {}};
            if (this.props.data.serverRoomStateBySlug && this.props.data.serverRoomStateBySlug[key]) {
                roomData = this.props.data.serverRoomStateBySlug[key];
            }

            let author = '';
            if (roomData.room.lastMessageAuthor && roomData.room.lastMessageMessageType === 'message') {
                author = '@' + roomData.room.lastMessageAuthor + ':';
            }

            let unreadItem = (
                <UnreadRoomItem key={key} 
                    count={d.count} mentioned={d.mentioned} slug={key} 
                    lastMessageAuthor={author}
                    lastMessageMessage={roomData.room.lastMessageMessage} 
                    lastMessageTimestamp={roomData.room.lastMessageTimestamp}
                    numUsersOnline={roomData.numUsersOnline}
                    />
            );

            if (d.mentioned) { groups.mentions.push(unreadItem); }
            else if (d.count > 0) { groups.counts.push(unreadItem); }
            else { groups.other.push(unreadItem); }
        });

        // build up array order
        let sortedUnreadItems = [];
        groups.mentions.sort(function (a, b) { return b.props.count - a.propscount; });

        // sort on count then sort on date
        groups.counts.sort(function (a, b) { return b.props.count - a.props.count; });
        groups.counts.sort(function (a, b) { 
            // sort within same values
            if (b.props.count === a.props.count) { return b.props.lastMessageTimestamp - a.props.lastMessageTimestamp; }
            else { return b.props.count - a.props.count; }
        });

        groups.other.sort(function (a, b) { return b.props.lastMessageTimestamp - a.props.lastMessageTimestamp; });
        sortedUnreadItems = groups.mentions.concat(groups.counts).concat(groups.other);

        // final order should be: 
        //      mentions (ordered by count) 
        //      count
        //      date

        // We're good! Render normal app
        return (
            <div className='notifications-wrapper'>
                <div className='unread__items'>
                    {sortedUnreadItems}
                </div>
            </div>
        );
    }
});

export default UnreadByRoom;
