var https = require('https');
var fs = require('fs');
var DataBase = require('jugglingdb').Schema;

var token = fs.readFileSync('token', 'utf8').replace(/\n/, '');

var db = new DataBase('mysql', {
    host: '192.168.33.33',
    database: 'scotchbox',
    username: 'root',
    password: ''
});

var girlsLvovTable = db.define('girls-lvov', {
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
        var path = '/method/likes.add?type=photo&owner_id=' + owner_id + '&item_id=' + item_id + this.token;

        return this._doRequest(path);
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

function log() {
    console.log((new Date().toLocaleString()), arguments);
}

function randomInt(min, max) {
    return (Math.ceil(Math.random() * (max - min)) + min);
}



function doLike(girl) {

    var photo_id = girl.photo_id.split('_')[1];

    var doLikepromise = VK.addLike(girl.id, photo_id).then(function (response) {
        log(girl.last_name, response);
        response = JSON.parse(response);

        return new Promise(function (resolve, reject) {
            if(response.error){
                reject(response);
            } else {
                resolve(girl);
            }
        })

    });

    return doLikepromise;
}

function actionAfterLike(girl) {

    girlsLvovTable.update({where: {id: girl.id}, update: {is_liked: 1}});

    return new Promise(function (ok) { ok(); });
}

/* MAIN */
function liker() {

    girlsLvovTable.findOne(
        {
            where: {is_liked: 0},
            order: 'last_update DESC'
        }
    ).then(
        doLike
    ).then(
        actionAfterLike
    ).then(
        setTimeout.bind(null, liker, randomInt(30000, 45000)) //  <<<<<<<-------- ENTER Recursion;
    ).catch(
        function (msg) {
            log(msg);
            process.exit();
        }
    );

}

liker();

