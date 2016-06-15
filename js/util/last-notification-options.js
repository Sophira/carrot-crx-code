/**
 * Shared object used to persist last notification message so we can access
 * properties when notification is clicked
 *
 * @module last-notification-options
 */
import _ from 'lodash';

var lastNotificationOptions = {};

export function setLastNotificationOptions (notificationOptions){
    lastNotificationOptions = _.cloneDeep(notificationOptions);
}
export function getLastNotificationOptions (){
    return lastNotificationOptions;
}
