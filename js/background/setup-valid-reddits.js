/**
 *
 * Keeps track of all valid reddits, using local storage
 *
 * @module background/setup-valid-reddits
 */
import $ from 'jquery';
import CONFIG from '../config.js';
import store from '../store/store.js';
import * as ACTIONS from '../store/actions.js';

export default function setupValidReddits () {
    chrome.runtime.onMessage.addListener(function gotMessage (message, sender, sendResponse) {
        var isValidSubreddit = false;
        let appData = store.getState().app;

        // check if reddit is valid
        if (message.messageType === 'checkForValidSubreddit') {
            let slugLowerCaseToCanonical = appData.slugLowerCaseToCanonical || {};
            let lowerCaseSlug = message.subreddit.toLowerCase();

            if (slugLowerCaseToCanonical[lowerCaseSlug]) {
                return sendResponse({
                    isValid: true, 
                    slug: slugLowerCaseToCanonical[lowerCaseSlug],
                    storeState: appData
                });
            }

            // hit carrot to see if the carrot room for the current subreddit
            // exists. If so, show chat embed
            $.ajax({
                url: CONFIG.carrotUrl + 'api/r/' + message.subreddit + '/simple',
                success: function (res) {
                    if (res && res.response && res.meta && !res.meta.error &&
                    // check for activationState
                    res.response.room.activationState > 0
                    ) {
                        // add legit subreddit
                        slugLowerCaseToCanonical[lowerCaseSlug] = res.response.room.slug;

                        store.dispatch(ACTIONS.setState({
                            slugLowerCaseToCanonical: slugLowerCaseToCanonical
                        }));

                        return sendResponse({
                            isValid: true, 
                            slug: res.response.room.slug,
                            storeState: appData
                        });

                    } else {
                        return sendResponse({
                            isValid: false,
                            slug: message.subreddit,
                            storeState: appData
                        });
                    }
                },
                error: function () {
                    return sendResponse({
                        isValid: false, 
                        slug: message.subreddit,
                        storeState: appData
                    });
                }
            });
        }

        return true;
    });
}
