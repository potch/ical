var iCal = require('./ical');

iCal.fromFile('Calendar', function(c) {
    console.log(c.between(new Date(), new Date(Date.now() + 1000*3600*24)));
});