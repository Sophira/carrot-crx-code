/**
 * Takes in a notification and return information (such as the target URL to
 * redirect user to)
 *
 * NOTE: This is not yet implemented; this is not yet used
 *
 * @module util/process-notification
 */
import logger from '../logger.js';

/**
 * Note this may be called from either a push notification or an actual
 * notification item click
 */
export default function processNotification (notification) {
    var options = {};
    logger.log('processNotification', 'called with: ', notification);

    if (notification.type === 'list') {
        // Notification with multiple items
        options.targetUrl = '/';

    } else {
        // Single notification
        if (notification.targetUrl) {
            options.targetUrl = notification.targetUrl;
        } else {
            if (notification.notificationMessageType === 'topicChange') {
                options.targetUrl = '/c/' +
                    (notification.message.match(/^([^ ]+)/)[1]);

            } else if (notification.notificationMessageType === 'directMessage') {
                // check direct message
                options.targetUrl = '/u/' +
                    (notification.message.match(/^([^ ]+)/)[1]);

            } else if (notification.message.match(/in ([^ ]+)$/)){
                // chat message
                options.targetUrl = '/c/' +
                    (notification.message.match(/in ([^ ]+)$/)[1]);
            }
        }

        if (!options.targetUrl) {
            options.targetUrl = '/';
        }
    }

    logger.log('processNotification', 'processed notification:', options);
    return options;
}
