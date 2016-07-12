/*
 * vk auth:
 * 1. https://oauth.vk.com/authorize?client_id=5503631&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=73730&response_type=token&v=5.52
 * 
 */ 
var https = require('https');
var fs = require('fs');
var timeout = 30 //sec
var token = fs.readFileSync('token','utf8');

var VK = {
	
	protocol: 'https:',
  	hostname: 'api.vk.com',  	
  	path: '&access_token=' + token + '&v=5.52',
  	avatars_album_id: -6,

  	getFeed: function(start_time, end_time, callback) {

  		this._doRequest('/method/newsfeed.get?source_ids=list2&filters=post&count=5&end_time=' + end_time + '&start_time=' + start_time + this.path)
  		.then(callback)
  		.catch(this._errHandle); 		

  	},

  	addLike: function(owner_id, item_id, callback){
  		
  		this._doRequest('/method/likes.add?type=photo&owner_id=' + owner_id + '&item_id=' + item_id + this.path)
  		.then(callback)
  		.catch(this._errHandle);
  	},

	_doRequest: function(path) {
		var prams = {protocol: this.protocol, hostname: this.hostname,	path: path};

		return new Promise(function(resolve, reject){
			https
			.get(prams, function (resp) {
				var data = '';
				resp.on('data', (chunk) => { data += chunk; });
				resp.on('end', () => { resolve(JSON.parse(data)); });
			})	
			.on('error', function(err) {
				if (err.CODE = 'ENOTFOUND'){
					reject('lost connection');
				} else {
					reject(err);
				}
			});
		});		
	},

	_errHandle: function(err){
		console.log(err);
	}
};


var scaner = {

	start_time: 0,
	end_time: 0,
	last_success_request_time: 0,
	timeout: 0,

	init: function(timeout) {
		this.timeout = timeout;
	},

	scan: function() {
		
		this.end_time = Date.now().toString().slice(0, -3);
		this.start_time = this.last_success_request_time || (this.end_time - this.timeout);

		console.log('start_time=', toTime(this.start_time), ' end_time=', toTime(this.end_time));

		VK.getFeed(this.start_time, this.end_time, this.findPost.bind(this));

		setTimeout(this.scan.bind(this), this.timeout * 1000);
	},

	findPost: function(feed) {
		
    		if (feed.error) {
			log(feed.error.error_msg);
			process.exit();
		}

		this.last_success_request_time = this.end_time;

		feed.response.items.map(function(item) {
			if (item.attachments && 
				item.attachments[0].photo &&
				item.attachments[0].photo.album_id === VK.avatars_album_id && 
				!item.likes.user_likes) 
			{
				var photo = item.attachments[0].photo;
				VK.addLike(photo.owner_id, photo.id, log);
				log(item.attachments[0]);
			}
		});
	}
};


function log(msg) {
	console.log (msg);
}

function toTime(unixtimestamp) {
    var dateObj = new Date(unixtimestamp *1000);
    return  ('0' + dateObj.getHours()).slice(-2) + ':' + 
            ('0' + dateObj.getMinutes()).slice(-2) + ':' + 
            ('0' + dateObj.getSeconds()).slice(-2);
}

scaner.init(timeout)
scaner.scan();
