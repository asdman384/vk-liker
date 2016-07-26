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

var VK = {

    protocol: 'https:',
    hostname: 'api.vk.com',
    token: '&access_token=' + token + '&v=5.52',
    avatars_album_id: -6,

    search: function (callback) {

        var groups = [{"id": 20629724, "name": "Хабрахабр"}],
            countries = [{"id": 2, "title": "Украина"}],
            cities = [{"id": 1057, "title": "Львов"}],
            method = 'users.search',
            params = '?' +
                    '&count=1000' +
                    '&fields=photo_id' +
                    '&country=' + countries[0].id +
                    '&city=' + cities[0].id +
                    '&sex=1' +
                    '&age_from=18'+
                    '&age_to=29'+
                    '&has_photo=1'+
                    '&group_id='+ groups[0].id;

        var path = '/method/' + method + params + this.token;

        this._doRequest(path)
            .then(callback)
            .catch(this._errHandle);
    },

    getFeed: function (start_time, end_time, callback) {

        this._doRequest('/method/newsfeed.get?source_ids=list2&filters=post&count=5&end_time=' + end_time + '&start_time=' + start_time + this.token)
            .then(callback)
            .catch(this._errHandle);

    },

    addLike: function (owner_id, item_id, callback) {

        this._doRequest('/method/likes.add?type=photo&owner_id=' + owner_id + '&item_id=' + item_id + this.token)
            .then(callback)
            .catch(this._errHandle);
    },

    _doRequest: function (path) {
        var params = {protocol: this.protocol, hostname: this.hostname, path: path};

        return new Promise(function (resolve, reject) {
            https
                .get(params, function (resp) {
                    var data = '';
                    resp.on('data', (chunk) => {data += chunk;});
                    resp.on('end', () => {resolve(data);});
                })
                .on('error', function (err) {
                    if (err.CODE === 'ENOTFOUND') {
                        reject('lost connection');
                    } else {
                        reject(err);
                    }
                });
        });
    },

    _errHandle: function (err) {
        log(err);
    }
};


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
    console.log(arguments);
}

function toTime(unixtimestamp) {
    var dateObj = new Date(unixtimestamp * 1000);
    return ('0' + dateObj.getHours()).slice(-2) + ':' +
        ('0' + dateObj.getMinutes()).slice(-2) + ':' +
        ('0' + dateObj.getSeconds()).slice(-2);
}

scaner.init(timeout);
scaner.scan();


// var g = JSON.parse(fs.readFileSync('', 'utf8'));
// var timeout = 1000
// g.response.items.map(function (item) {
//     if (!item.photo_id) return;
//     var photo_id = item.photo_id.split('_')[1];
//     timeout += 1000;
//     setTimeout(function () {
//         VK.addLike(item.id, photo_id, log.bind(null, item.id, photo_id, item.last_name+' '+item.first_name));
//     },timeout)
// });
// log(VK.search());