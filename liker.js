var fs          = require('fs');
var util        = require('util');
var VK          = require('vk')(fs.readFileSync('token', 'utf8').replace(/\n/, ''));
var DataBase    = require('jugglingdb').Schema;
var TelegramBot = require('node-telegram-bot-api');

var db = new DataBase('mysql', {
    host: '192.168.33.33',
    database: 'scotchbox',
    username: 'root',
    password: 'root'
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
var telegramBot = new TelegramBot(fs.readFileSync('telegram-bot-token', 'utf8').replace(/\n/, ''), {polling: true});
var tgChatId = 137905286;

telegramBot.on('message', function (msg) {

    var text = '123';
    telegramBot.sendMessage(tgChatId, text);
});

/* MAIN */
function liker(captcha) {

    girlsLvovTable.findOne(
        {
            where: {is_liked: 0},
            order: 'last_update DESC'
        }
    ).then(
        doLike.bind(null, captcha)
    ).then(
        actionAfterLike
    ).then(
        setTimeout.bind(null, liker, randomInt(30000, 45000)) //  <<<<<<<-------- ENTER Recursion;
    ).catch(
        function (msg) {
            log(msg);
            if(msg.data.error)
                telegramBot.sendMessage(tgChatId, JSON.stringify(msg));
            process.exit();
        }
    );
}

liker();


function doLike(captcha, girl) {

    var photo_id = girl.photo_id.split('_')[1];

    var doLikepromise = VK.addLike(girl.id, photo_id, captcha).then(function (response) {

        log('https://new.vk.com/id' + girl.id, response.data);

        response.data = JSON.parse(response.data);

        return new Promise(function (resolve, reject) {
            if(response.data.error){
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

//helpers
function log() {
    console.log((new Date().toLocaleString()), arguments);
}
function randomInt(min, max) {
    return (Math.ceil(Math.random() * (max - min)) + min);
}


