
var https = require('https');
var fs = require('fs');
var timeout = 15; //sec
var token = fs.readFileSync('token', 'utf8').replace(/\n/, '');
var exec = require('child_process').exec;
var groups = [{"id": 20629724, "name": "Хабрахабр"}],
    countries = [{"id": 2, "title": "Украина"}],
    cities = [{"id": 1057, "title": "Львов"}],
    unixoneday = 86400 * 1000;

var Schema = require('jugglingdb').Schema;
var schema = new Schema('mysql', {
    host: '192.168.33.33',
    database: 'scotchbox',
    username: 'root',
    password: ''
});

var girlsLvov = schema.define('girls-lvov', {
    id:             {type: Number},
    photo_id:       {type: String},
    last_seen:      {type: Number},
    first_name:     {type: String},
    last_name:      {type: String},
    b_year:         {type: Number},
    b_month:        {type: Number},
    b_day:          {type: Number},
    last_update:    {type: String},
    is_liked:       {type: Number}
});


var VK = {

    protocol: 'https:',
    hostname: 'api.vk.com',
    token: '&access_token=' + token + '&v=5.52',
    avatars_album_id: -6,

    search: function (params, callback) {
        var method = 'users.search?',
            path = '/method/' + method;

        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                var value = params[key];
                path += '&' + key + '=' + value;
            }
        }
        path += this.token;

        this._doRequest(path)
            .then(callback)
            .catch(this._errHandle);
    },

    getFeed: function (start_time, end_time, callback) {

        this._doRequest('/method/newsfeed.get?source_ids=list2&filters=post&count=5&end_time=' + end_time + '&start_time=' + start_time + this.token)
            .then(callback)
            .catch(this._errHandle);

    },

    addLike: function (owner_id, item_id) {
        return this._doRequest('/method/likes.add?type=photo&owner_id=' + owner_id + '&item_id=' + item_id + this.token);
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


function loadFromVK(unixtimestamp) {

    var dateObj = new Date(unixtimestamp),
        day = dateObj.getDate(),
        month = dateObj.getMonth() + 1,
        year = dateObj.getFullYear();

    log(unixtimestamp, year + '/' + month + '/' + day);

    VK.search({
            birth_day: day, birth_month: month, birth_year: year,
            city: cities[0].id, country: countries[0].id,
            sex: 1, fields: 'photo_id,last_seen', count: 1000
        },
        function (data) {
            data = JSON.parse(data);
            if (data.error) {
                log(data.error.error_msg);
                process.exit();
            }

            console.log('         count:' + data.response.items.length);

            if (data.response.items.length === 0) {
                log(data);
                process.exit();
            }

            data.response.items.map(function (item) {

                girlsLvov.create({
                    id: item.id,
                    photo_id: item.photo_id || 'no',
                    last_seen: item.last_seen.time,
                    first_name: item.first_name, last_name: item.last_name,
                    b_year: year, b_month: month, b_day: day
                });
            });

            setTimeout(loadFromVK.bind(null, unixtimestamp + unixoneday), randomInt(10000, 18000)); //  <<<<<<<-------- ENTER Recursion;

        }
    );

}



function log() {
    console.log((new Date().toLocaleString()), arguments);
}
function randomInt(min, max) {
    return (Math.ceil(Math.random() * (max - min)) + min);
}



var datetimeunix = 780537600 * 1000;
loadFromVK(datetimeunix);
