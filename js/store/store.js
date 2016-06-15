/**
 *
 * store.js
 *      App store
 * @module store
 *
 */
/**
 * dependencies
 */
import thunk from 'redux-thunk';

/** Logger */
//import logger from '../logger.js';
let logger = {log: function (){} };


import { compose, createStore, combineReducers, applyMiddleware } from 'redux';

// we'll just use a single reducer to simplify things
var reducers = { app: require('./reducers-app') };

/**
 *
 * middleware
 *
 */
function logMiddleware ({ dispatch, getState }) {
    logger.log('logMiddleware:setup', 'called', arguments);
    return function(next) {
        logger.log('logMiddleware:wrappedNext', 'called');
        return function (action) {
            logger.log('logMiddleware:wrappedAction:' + action.type,
                'called with %O', action);
            return next(action);
        };
    };
}

/**
 *
 * Setup store and reducer
 *
 */

// setup store with middleware
const createStoreWithMiddleware = compose(
    applyMiddleware(logMiddleware, thunk)
)(createStore);
const store = createStoreWithMiddleware(combineReducers(reducers));

export default store;
