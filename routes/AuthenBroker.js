var express = require('express');
var router = express.Router();
var mosca = require('mosca');
var ip = require('ip');
// var fs = require("fs");
// var Connection = require("mqtt-connection");
// var ws = require("websocket-stream");

var mongoose = require('mongoose');
// var mongodbURL='mongodb://mqttserver:qwerty@proton.it.kmitl.ac.th:27017/mqttserver';
var mongodbURL='mongodb://10.50.8.27:27017/mqttserver'; // IP Address
// var mongodbURL='mongodb://localhost/mqttserver';

// var SECURE_KEY = __dirname + '/../secure/tls-key.pem';
// var SECURE_CERT = __dirname + '/../secure/tls-cert.pem';

var ascoltatore = {
  //using ascoltatore
  type: 'mongo',
  url: mongodbURL,
  pubsubCollection: 'ascoltatori',
  mongo: {}
};

var settings = {
  // port: 8883,
  // backend: ascoltatore,
  // http: {
  //   port: 8884,
  //   bundle: true,
  //   static: './'
  // },
  // secure : { 
  //   keyPath: SECURE_KEY,
  //   certPath: SECURE_CERT,
  // }

  interfaces: [
        { type: "mqtt", port: 8883 },
        { type: "http", port: 8884, bundle: true }
  ],
  stats: false,
  backend: ascoltatore
};

var userDB = mongoose.model('user', { email: String ,
                   password: String ,
                   username_broker: String ,
                   password_broker: String ,
                   devices: [{device_id: String ,
                          device_name: String,
                          device_description: String,
                          subscribe:[String],
                          status: String}],
                   limit_connection: Number
                });

// function createConnection(port) {
//   var stream = ws("wss://localhost:" + port, [], {
//     ca: fs.readFileSync(SECURE_CERT),
//     rejectUnauthorized: false
//   });

//   var conn = new Connection(stream);

//   stream.on('connect', function() {
//     conn.emit('connected');
//   });

//   return conn;
// }

var server = new mosca.Server(settings);

// Authen
var authenticate = function(client, username, password, callback) {
  userDB.find({'username_broker': username , 'password_broker': password}, function(err,userData){
      if(userData.length ==  0){
        console.log('user not found');
      }else{
        var clientUser = userData[0].email;
        console.log(userData);
        console.log(clientUser);

        var authorized = (username && password);
        if (authorized){
          client.user = clientUser;
          client.username_broker = username;
          client.password_broker = password;
        } 
        console.log(client);
        callback(null, authorized);
      }
  });
}

var authorizePublish = function(client, topic, payload, callback) {
  callback(null, client.username_broker == topic.split('/')[0]);
}

var authorizeSubscribe = function(client, topic, callback) {
  callback(null, client.username_broker == topic.split('/')[0]);
}


server.on('clientConnected', function(client) {
    userDB.find({email: client.user , "devices.device_id": client.id}, function(err,userData){
      console.log(userData.length);
      if(userData.length != 0){
        userDB.update({email: client.user , "devices.device_id": client.id}, {$set : {"devices.$.status" : "connect"}}, function(err,userData){
          console.log(userData);
        })
      }
    })
    console.log('Authen Broker -----> client connected', client.id , '\n');
});

// fired when a message is received
server.on('published', function(packet) {
  console.log('Authen Broker -----> Published to topic : ' ,packet.topic , '\nAuthen Broker -----> Published message : ', packet.payload.toString() , '\n');
});

server.on('subscribed', function(topic) {
  console.log('Authen Broker -----> subscribed : ', topic , '\n');
});

server.on('unsubscribed', function(topic, client) {
  console.log('Authen Broker -----> unsubscribed : ', topic , '\n');
});

// fired when a client is disconnecting
server.on('clientDisconnecting', function(client) {
  console.log('Authen Broker -----> clientDisconnecting : ', client.id , '\n');
});
 
// fired when a client is disconnected
server.on('clientDisconnected', function(client) {
  userDB.find({email: client.user , "devices.device_id": client.id}, function(err,userData){
      console.log(userData.length);
      if(userData.length != 0){
        userDB.update({email: client.user , "devices.device_id": client.id}, {$set : {"devices.$.status" : "disconnect"}}, function(err,userData){
          console.log(userData);
        })
      }
    })
  console.log('Authen Broker -----> clientDisconnected : ', client.id , '\n');
});

server.on('ready', setup);

// fired when the mqtt server is ready
function setup() {
  server.authenticate = authenticate;
  server.authorizePublish = authorizePublish;
  server.authorizeSubscribe = authorizeSubscribe;
  console.log('Authen Broker -----> Mosca server is up and running');
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
