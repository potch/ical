var fs = require('fs');
var moment = require('moment');
var rrule = require('rrule').RRule;

var timestampRE = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/;

function iCal(cal) {
    this.VCALENDAR = cal.VCALENDAR;
    this.VEVENT = this.VCALENDAR.VEVENT;
}

iCal.prototype = {
    between: function (d1, d2) {
        var events = [];
        this.VEVENT.forEach(function(e) {
            if (moment(d1).isBefore(e.DTSTART.date) &&
                moment(d2).isAfter(e.DTSTART.date)) {
                events.push({
                    uid: e.UID,
                    summary: e.SUMMARY,
                    start: e.DTSTART.date,
                    end: e.DTEND.date
                });
            }
            if (e.RRULE) {
                e.RRULE.between(d1, d2).forEach(function(t) {
                    events.push({
                        uid: e.UID,
                        summary: e.SUMMARY,
                        start: t,
                        end: e.DTEND.date
                    });
                });
            }
        });
        return events;
    }
};

function parse(str) {
    var lines = str.split(/\r?\n/);

    // Collapse all line breaks
    for (var i=0; i<lines.length; i++) {
        if (lines[i][0] === ' ') {
            lines[i-1] += lines[i].substring(1);
            lines.splice(i, 1);
            i--;
        }
    }

    return new iCal(chomp(lines));
}

function chomp(lines) {
    var line;
    var o = {};
    var key;
    while (lines.length) {
        line = lines.shift();

        var colonPos = line.indexOf(':');
        var semiPos = line.indexOf(';');
        if (colonPos < 0 || (semiPos > 0 && semiPos < colonPos)) {
            if (semiPos < 0) continue;
            key = line.substring(0, semiPos);
            val = line.substring(semiPos + 1);
        } else {
            key = line.substring(0, colonPos);
            val = line.substring(colonPos + 1);
        }
        if (key === 'BEGIN') {
            if (val in o) {
                if (!(o[val] instanceof Array)) {
                    o[val] = [o[val]];
                }
                o[val].push(chomp(lines));
            } else {
                o[val] = chomp(lines);
            }
        } else if (key === 'END') {
            return o;
        } else if (key === 'RRULE') {
            o[key] = rrule.fromString(val);
        } else {
            var ts = timestampRE.exec(val);
            if (ts) {
                val = {
                    raw: val,
                    stamp: ts[0],
                    date: new Date(+ts[1], +ts[2] - 1, +ts[3], +ts[4], +ts[5], +ts[6])
                };
            }
            if (key === 'ATTENDEE') {
                var pairs = val.split(';');
                val = {};
                pairs.forEach(function(p) {
                    var pair = p.split('=');
                    val[pair[0]] = pair[1];
                });
            }
            if (key in o) {
                if (!(o[key] instanceof Array)) {
                    o[key] = [o[key]];
                }
                o[key].push(val);
            } else {
                o[key] = val;
            }
        }
    }
    return o;
}

function fromFile(path, cb) {
    fs.readFile(path, function(err, file) {
        if (err) {
            throw 'Could not read file: ' + err;
        }
        cb(parse(file.toString()));
    });
}

module.exports = {
    fromFile: fromFile
};