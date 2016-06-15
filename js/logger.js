var logger = {
    log: function(args){
        if (args.indexOf('tab-tracking') > -1) { return; }

        console.log.apply(console, arguments);
    }
};

export default logger;
