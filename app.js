/*
 * usage: nohup node app.js > log.log 2>&1 &
 * vk auth:
 * 1. https://oauth.vk.com/authorize?client_id=5503631&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=73730&response_type=token&v=5.52
 * 
 */
var https = require('https');
var fs = require('fs');
var timeout = 15; //sec
var token = fs.readFileSync('token', 'utf8').replace(/\n/, '');
var exec = require('child_process').exec;
var VK  = require('vk')(fs.readFileSync('token', 'utf8').replace(/\n/, ''));

var scaner = {

    start_time: 0,
    end_time: 0,
    last_success_request_time: 0,
    timeout: 0,

    init: function (timeout) {
        this.timeout = timeout;
    },

    scan: function () {

        this.end_time = Date.now().toString().slice(0, -3);
        this.start_time = this.last_success_request_time || (this.end_time - this.timeout);

        //console.log('start=', toTime(this.start_time), ' end=', toTime(this.end_time));

        VK.getFeed(this.start_time, this.end_time, this.findPost.bind(this));

        setTimeout(this.scan.bind(this), this.timeout * 1000);
    },

    findPost: function (feed) {

        feed = JSON.parse(feed);

        if (feed.error) {
            log(feed.error.error_msg);
            process.exit();
        }

        this.last_success_request_time = this.end_time;

        feed.response.items.map(function (item) {

            if (item.post_source.data === "profile_photo") {
                var photo = item.attachments[0].photo;
                var profile = feed.response.profiles.find(item => item.id === photo.owner_id);

                VK.addLike(
                    photo.owner_id,
                    photo.id,
                    log.bind(null,
                        toTime(this.end_time),
                        profile.first_name + '_' + profile.last_name,
                        photo.photo_1280 || photo.photo_807 || photo.photo_604
                    )
                );

            }
        });
    }
};

var Phone = {

    notify: function (title, text, url) {
        exec('termux-notification -c ' + text + ' -t ' + title + ' -u ' + url);
    }

};

function log() {
    console.log((new Date().toLocaleString()), arguments);
}

function toTime(unixtimestamp) {
    var dateObj = new Date(unixtimestamp * 1000);
    return ('0' + dateObj.getHours()).slice(-2) + ':' +
        ('0' + dateObj.getMinutes()).slice(-2) + ':' +
        ('0' + dateObj.getSeconds()).slice(-2);
}

scaner.init(timeout);
scaner.scan();

