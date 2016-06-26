var http = require('http');

var feedUrl = 'https://api.vk.com/method/wall.get?owner_id=4098511&count=2&access_token=6ec9727ace46363c52f816f72554286d118b15b0eea8c38d9a2a712242bc4035451e8b6ca687fc0f86aa0&v=5.52'


http.get(feedUrl, getFeed);


function getFeed(resp) {
    var data = '';
    
    resp.on('data', (ch) => { data += ch; } );
    resp.on('end', () => { console.log(JSON.parse(data)); });
};
