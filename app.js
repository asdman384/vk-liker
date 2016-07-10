/*
 * vk auth:
 * 1. https://oauth.vk.com/authorize?client_id=5503631&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=73730&response_type=token&v=5.52
 * 
 */ 
var https = require('https');
var timeout = 30 //sec
var token = '';

var VK = {

	protocol: 'https:',
  	hostname: 'api.vk.com',  	
  	path: '&access_token=' + token + '&v=5.52',

  	getFeed: function(start_time, end_time, callback) {

  		this._doRequest(
  			{
  				protocol: this.protocol,
  				hostname: this.hostname,
  				path: '/method/newsfeed.get?source_ids=list2&filters=post&count=3&end_time=' + end_time + '&start_time=' + start_time + this.path
  			}, 
  			callback
  		);  		

  	},

  	addLike: function(owner_id, item_id, callback){

  		this._doRequest(
  			{
  				protocol: this.protocol,
  				hostname: this.hostname,
  				path: '/method/likes.add?type=photo&owner_id=' + owner_id + '&item_id=' + item_id + this.path
  			}, 
  			callback
  		);
  	},

	_doRequest: function(params, callback) {

		function getData(resp) {
		    var data = '';
		    
		    resp.on('data', (ch) => { data += ch; } );
		    resp.on('end', () => {
				
				console.log(data);

		    	data = JSON.parse(data); 

	    		if (data.error) {
					log(data.error.error_msg);
					process.exit();
				}

		    	callback(data); 
		    });
		};

		var request = https.get(params, getData);

		request.on('error', function(err) {
			if (err.CODE = 'ENOTFOUND'){
				console.log('lost connection');
			} else {
				console.log(err);
			}
		});
	}
};


var scaner = {

	start_time: 0,
	end_time: 0,
	last_request_time: 0,

	scan: function(timeout) {

		this.end_time = Date.now().toString().slice(0, -3);
		this.start_time = this.last_request_time || (this.end_time - timeout);

		console.log('start_time=', this.start_time, ' end_time=', this.end_time);

		VK.getFeed(this.start_time, this.end_time, this.findPost.bind(this));

		setTimeout(this.scan.bind(this), timeout * 1000);
	},

	findPost: function (feed) {

		if (feed.error){
			console.log(feed);
			return;			
		}

		this.last_request_time = this.end_time;

		feed.response.items.map(function(item){
			if (item.attachments && 
				item.attachments[0].photo.album_id === -6 && 
				!item.likes.user_likes) 
			{
				var photo = item.attachments[0].photo;
				VK.addLike(photo.owner_id, photo.id, log)
			}
		});
	}
};


function log(msg) {
	console.log (msg);
}



scaner.scan(timeout);
