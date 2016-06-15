/**
 *
 * Front page logic. Inserts notifications / rooms on reddit
 *
 * @module reddit__front-page
 */
import $ from 'jquery';
import _ from 'lodash';

// import logger from '../logger.js';
let logger = {log: function() {}};

import CONFIG from '../config.js';

/**
 *
 * Main script to load when on reddit
 *
 */
export default function frontpageLogic () {
    logger.log('reddit/frontpageLogic', 'called');

    function insertCarrotRooms () {
        // get data
        chrome.runtime.sendMessage({
            messageType: 'getState'
        }, function (state) {
            let app = state.app;
            $('#carrot__rooms-wrapper').remove();

            // if there are no keys (user has no rooms), or if they are not 
            // logged in, then don't render anything
            if (!app.username || !app.unreadByRoom || Object.keys(app.unreadByRoom).length < 1) { return false; }

            // prepare divs
            let carrotRoomsWrapper = $('<div id="carrot__rooms-wrapper"></div>');
            let carrotRooms = $('<div id="carrot__rooms-inner"></div>');
            carrotRooms.append('<div id="carrot__rooms-header">Your Carrot Rooms</div>');

            // convert data to ordered array
            let unreads = [];
            _.each(app.unreadByRoom, function (val, key) {
                val.slug = key;
                unreads.push([key, val]);
            });

            // alphabetically sort
            unreads.sort(function (a, b) { 
                let sortA = a[0].toLowerCase();
                let sortB = b[0].toLowerCase();
                if (sortA < sortB) { return -1; }
                else if (sortB < sortA) { return 1; }
                else { return 0; }
            });

            // add an icon for each room
            unreads.forEach(function (d) {
                let room = d[1];
                let roomEl = $('<div class="carrot__room-wrapper ' + (room.count > 0 ? 'carrot__room-wrapper--read' : 'carrot__room-wrapper--unread') + '"></div>');

                let onlineText = '';
                let onlineCount = 0;
                if (app.serverRoomStateBySlug && app.serverRoomStateBySlug[room.slug]) {
                    onlineCount = app.serverRoomStateBySlug[room.slug].numUsersOnline;
                    if (onlineCount) {
                        if (onlineCount < 1000) {
                            onlineText = `<span class="online-icon"></span> ${onlineCount} online`;
                        } else {
                            onlineText = `<span class="online-icon"></span> ${onlineCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
                        }
                    }
                }

                let mentionedHtml = '';
                if (room.mentioned) {
                    mentionedHtml = '<div class="carrot__room-mentioned">1</div>';
                }

                roomEl.html(`
                    ${mentionedHtml}
                    <div class="carrot__room-wrapper-inner">
                        <div class="carrot__room-icon" 
                            style="background-image:url(https://prod-assets.carrot.com/icons/${(room.slug || '').toLowerCase().trim()}.png), url(https://prod-assets.carrot.com/img/carrot-default.png);">
                        </div>
                        <div class="carrot__room-slug">
                            ${room.slug}
                        </div>
                        <div class="carrot__room-count">
                            ${onlineText}
                        </div>
                    </div>
                    `
                );

                roomEl.click(function () {
                    // send message letting the backend know the user has
                    // clicked a room FROM reddit and update the user's
                    // online state
                    chrome.runtime.sendMessage({
                        messageType: 'analytics:send',
                        group: 'reddit:roomClicked',
                        routingKey: room.slug,
                        sourcePage: window.location.pathname,
                        onlineCountWhenClicked: onlineCount,
                        unreadCountWhenClicked: room.count
                    }, function () {});

                    window.open(CONFIG.carrotUrl + 'r/' + room.slug); 
                });

                carrotRooms.append(roomEl);
            });            

            carrotRooms.append('<div style="clear: both;"></div>');

            // add div to wrapper
            carrotRoomsWrapper.append(carrotRooms);

            // Insert rooms
            if ($('.side .sidebox.create').children().length > 1) {
                $('.side .sidebox.create').parent().after(carrotRoomsWrapper);
            } else {
                $('.side .sidebox.submit.submit-text').parent().after(carrotRoomsWrapper);
            }
        });
    }

    // small chance to force an online count update
    if (Math.random() < 0.3) {
        chrome.runtime.sendMessage({
            messageType: 'fetchAndUpdateNotifications',
            options: { forceOnlineFetch: true }
        }, function () {});

        setTimeout(insertCarrotRooms, 1000 * 6);
    }

    // insert immediately
    insertCarrotRooms();

    // every 65 seconds, re-create the rooms insert
    setInterval(insertCarrotRooms, 1000 * 65);
}
