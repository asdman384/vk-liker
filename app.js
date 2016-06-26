var http = require('http');
http.get('http://api.ipify.org/?format=json', responseCb);
function responseCb(resp) {
    console.log(1);
    var data = '';
    resp.on('data',function(ch){console.log('data',ch);data += ch});
    resp.on('end', function(){console.log(data)});
};