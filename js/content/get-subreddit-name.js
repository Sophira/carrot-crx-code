import _ from 'lodash';

/**
 * grabs the subreddit name from the URL. Returns null if the subreddit is on
 * the blacklist or doesn't exist
 */
export default function getSubredditName () {
    let windowPath = window.location.pathname;
    let subredditName = null;

    // Homepage should just default to 'all'
    if(windowPath === '/'){ subredditName = 'all'; }
    else {
        // grab subreddit name
        let matched = windowPath.match(/\/r\/([^\/]+)/);
        if(matched){
            subredditName = matched[1];
        }
    }

    // Black list certain pages
    var blackList = [ 'r/friends/', 'r/Dashboard/', 'r/mod/' ];
    _.each(blackList, function(item){
        // if we find any match, set the url to null
        if(windowPath.indexOf(item) !== -1){
            subredditName = null;
            return false;
        }
    });

    return ('' + subredditName).toLowerCase();
}
