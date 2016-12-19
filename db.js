var Dynamite = require('dynamite');
var cfg = require('./config');

var options = {
    region : cfg.ALEXA.REGION,
    accessKeyId : cfg.ALEXA.ACCESS_KEY,
    secretAccessKey : cfg.ALEXA.SECRET_ACCESS_KEY
}

var client = new Dynamite.Client(options);

var db = function(){};
db.prototype.write = function(userId, items){
    return client.putItem().execute();
};


module.exports = db;