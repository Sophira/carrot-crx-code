/**
 *
 * Functionality to run on specific subreddits
 *
 * @module subreddit-logic
 */
import $ from 'jquery';
import _ from 'lodash';

//import logger from '../logger.js';
let logger = {log: function() {}};

import CONFIG from '../config.js';
import getSubredditName from './get-subreddit-name.js';

/**
 *
 * Main script to load when on reddit
 *
 */
export default function runSubredditLogic () {
    logger.log('reddit/runSubredditLogic', 'called');
}
