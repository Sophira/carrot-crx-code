/**
 * Retuns a "pretty" duration time e.g., 2 hours, 42 minutes, 10 seconds
 *
 * @module util/get-pretty-duration
 */
import moment from 'moment';

/**
 * UTIL
 *
 * @param {Number} durationInSeconds - duration length, in seconds
 * @param {String} timeSlice - Type of time slice - either 'months', 'days',
 *      'minutes', 'hours', 'seconds'
 */
function prettyDurationByTime (durationInSeconds, timeSlice) {
    let convertedDuration = moment.duration(durationInSeconds, 'seconds');

    switch (timeSlice) {
    case 'months':
        convertedDuration = convertedDuration.months();
        break;
    case 'days':
        convertedDuration = convertedDuration.days();
        break;
    case 'hours':
        convertedDuration = convertedDuration.hours();
        break;
    case 'minutes':
        convertedDuration = convertedDuration.minutes();
        break;
    case 'seconds':
        convertedDuration = convertedDuration.seconds();
        break;
    default:
        convertedDuration = convertedDuration.seconds();
    }

    timeSlice = timeSlice.replace(/s$/, '');
    convertedDuration += ' ' + timeSlice + (convertedDuration === 1 ? '' : 's');

    return convertedDuration;
}

/**
 *
 * Get pretty duration string
 *
 */
export default function getPrettyDurationString (durationNumber, includeAll) {
    let prettyDuration = moment.duration(durationNumber, 'seconds').humanize();

    let months = prettyDurationByTime((durationNumber | 0), 'months');
    let days = prettyDurationByTime((durationNumber | 0), 'days');
    let hours = prettyDurationByTime((durationNumber | 0), 'hours');
    let minutes = prettyDurationByTime((durationNumber | 0), 'minutes');
    let seconds = prettyDurationByTime((durationNumber | 0), 'seconds');

    // make it look nice. Check low to high
    if (durationNumber < 1) {
        prettyDuration = 'now';

    } else if (durationNumber < 60){
        // seconds
        prettyDuration = seconds.replace(/seconds?/, '') + 'sec';

    } else if (durationNumber < (60 * 60)) {
        // minutes
        prettyDuration = minutes.replace(/minutes?/, '') + 'min';

    } else if (durationNumber < (60 * 60 * 24)) {
        // hours
        prettyDuration = hours;

    } else if (durationNumber < (60 * 60 * 24 * 30)) {
        // days
        if (includeAll) {
            prettyDuration = days + ', ' + hours + ', ' + minutes + ', ' + seconds;
        } else {
            prettyDuration = days;
        }

    } else {
        // months
        if (includeAll) {
            prettyDuration = months + ', ' + days + ', ' + hours + ', ' +
                minutes + ', ' + seconds;
        } else {
            prettyDuration = months;
        }
    }

    return prettyDuration;
}
