var express = require('express');
var router = express.Router();
var mosca = require('mosca');
var ip = require('ip');
var mongoose = require('mongoose');
// var mongodbURL='mongodb://mqttserver:qwerty@proton.it.kmitl.ac.th:27017/mqttserver';
var mongodbURL='mongodb://10.50.8.27:27017/mqttserver'; // IP Address
// var mongodbURL='mongodb://localhost/mqttserver';

var ascoltatore = {
  //using ascoltatore
  type: 'mongo',
  url: mongodbURL,
  pubsubCollection: 'ascoltatori',
  mongo: {}
};

var settings = {
  // port: 1883,
  // backend: ascoltatore,
  // http: {
  //   port: 1884,
  //   bundle: true,
  //   static: './'
  // }

  interfaces: [
        { type: "mqtt", port: 1883 },
        { type: "http", port: 1884 }
  ],
  stats: false,
  backend: ascoltatore
};

var server = new mosca.Server(settings);

// Authen
// var authenticate = function(client, username, password, callback) {
//   var authorized = (username === 'mqttserver' && password.toString() === 'qwerty');
//   if (authorized){
//   	client.user = username;
//   } 
//   callback(null, authorized);
// }

// var authorizePublish = function(client, topic, payload, callback) {
//   callback(null, client.user == topic.split('/')[0]);
// }

// var authorizeSubscribe = function(client, topic, callback) {
//   callback(null, client.user == topic.split('/')[0]);
// }


server.on('clientConnected', function(client) {
    console.log('Public Broker -----> client connected', client.id , '\n');
});

// fired when a message is received
server.on('published', function(packet) {
  console.log('Public Broker -----> Published to topic : ' ,packet.topic , '\nPublic Broker -----> Published message : ', packet.payload.toString() , '\n');
});

server.on('subscribed', function(topic) {
  console.log('Public Broker -----> subscribed : ', topic , '\n');
});

server.on('unsubscribed', function(topic, client) {
  console.log('Public Broker -----> unsubscribed : ', topic , '\n');
});

// fired when a client is disconnecting
server.on('clientDisconnecting', function(client) {
  console.log('Public Broker -----> clientDisconnecting : ', client.id , '\n');
});
 
// fired when a client is disconnected
server.on('clientDisconnected', function(client) {
  console.log('Public Broker -----> clientDisconnected : ', client.id , '\n');
});

server.on('ready', setup);

// fired when the mqtt server is ready
function setup() {
  // server.authenticate = authenticate;
  // server.authorizePublish = authorizePublish;
  // server.authorizeSubscribe = authorizeSubscribe;
  console.log('Public Broker -----> Mosca server is up and running');
  console.log (ip.address() , '\n');
}

// server.published = function(packet, client, cb) {
//   if (packet.topic.indexOf('echo') === 0) {
//     return cb();
//   }
 
//   var newPacket = {
//     topic: 'echo/' + packet.topic,
//     payload: packet.payload.toString(),
//     retain: packet.retain,
//     qos: packet.qos
//   };
 
//   console.log('newPacket', newPacket);
  
//   server.publish(newPacket, cb);
// }

/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'ITMQ' });
// });

module.exports = router;
