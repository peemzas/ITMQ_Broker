var express = require('express');
var router = express.Router();
var mosca = require('mosca');
var ip = require('ip');
var io = require('socket.io').listen(5000);
// var fs = require("fs");
// var Connection = require("mqtt-connection");
// var ws = require("websocket-stream");

var mongoose = require('mongoose');
var mongodbURL='mongodb://mqttserver:qwerty@proton.it.kmitl.ac.th:27017/mqttserver';
var countAuthenDeviceConnected = 0;
var countAuthenMessagePublish = 0;
// var mongodbURL='mongodb://10.50.8.27:27017/mqttserver'; // IP Address
// var mongodbURL='mongodb://localhost/mqttserver';

// var SECURE_KEY = __dirname + '/../secure/tls-key.pem';
// var SECURE_CERT = __dirname + '/../secure/tls-cert.pem';

// var ascoltatore = {
//   //using ascoltatore
//   type: 'mongo',
//   url: mongodbURL,
//   pubsubCollection: 'ascoltatori',
//   mongo: {}
// };

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
  stats: false
  // backend: ascoltatore
};

var userDB = mongoose.model('user', { email: String ,
                   password: String ,
                   username_broker: String ,
                   password_broker: String ,
                   devices: [{device_id: String ,
                          device_name: String,
                          device_description: String,
                          device_type: String,
                          category:String,
                          subscribe:[String],
                          status: String,
                          project_id: String}],
                   limit_connection: Number
                });

var messageDB = mongoose.model('message', { email: String,
                                    project_id: String,
                                    device_id: String,
                                    topic: String,
                                    payload: String,
                                    subscriber: [String],
                                    date: { type: Date, default: Date.now, required: true, expires: '1h' }
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
  if (client.id.split('_')[0] === 'web'){
    userDB.find({'username_broker': username , 'password_broker': password}, function(err,userData){
      if (userData.length == 0) {
        console.log('user not found');
      }else{
        var authorized = (username && password);
          if (authorized){
            client.user = client.id.split('_')[1];
            client.username_broker = username;
            client.password_broker = password;

            
            client.deviceStatus = {};
            // console.log(client);
          } 
          // console.log(client);
          callback(null, authorized);
      }
    });
  }else{
    userDB.find({'username_broker': username , 'password_broker': password , devices:{ $elemMatch: {device_id: client.id}}}, function(err,userData){
      if(userData.length ==  0){
        console.log('user not found');
      }else{
        var clientUser = userData[0].email;
        // console.log(userData);
        // console.log(clientUser);

        var authorized = (username && password);
        if (authorized){
          client.user = clientUser;
          client.username_broker = username;
          client.password_broker = password;

          
          client.deviceStatus = {};
          // console.log(client);
        } 
        // console.log(client);
        callback(null, authorized);
      }
    });
  }
}

// io.sockets.on("connection", function(socket){
//         console.log('user connected');
//         socket.emit("deviceStatus", deviceStatus);

//         socket.on('disconnect', function(){
//           console.log('user disconnected');
//         });

//         socket.on('deviceStatus', function(msg){
//           console.log("Server : " + msg);
//           // socket.emit("deviceStatus", msg);
//         });
//       })

var authorizePublish = function(client, topic, payload, callback) {
  if (client.id.split('_')[0] === 'web'){
    callback(null, client.username_broker == topic.split('/')[0]);
  }else{
    userDB.find({email: client.user , "devices.device_id": client.id}, {"devices.device_id.$": client.id}, function(err,deviceData){
      console.log("Authen publish : " + deviceData[0].devices[0].device_type);
      if(deviceData[0].devices[0].device_type == 'Publisher' || deviceData[0].devices[0].device_type == 'Both'){
        console.log('You can publish OK?');
        callback(null, client.username_broker == topic.split('/')[0]);
      }else if(deviceData[0].devices[0].device_type == 'Subscriber'){
        console.log('You can not publish OK?, DAFUQ');
      }
    })
  }
}

var authorizeSubscribe = function(client, topic, callback) {
  if (client.id.split('_')[0] === 'web'){
    callback(null, client.username_broker == topic.split('/')[0]);
  }else{
    userDB.find({email: client.user , "devices.device_id": client.id}, {"devices.device_id.$": client.id}, function(err,deviceData){
      console.log("Authen publish : " + deviceData[0].devices[0].device_type);
      if(deviceData[0].devices[0].device_type == 'Publisher'){
        console.log('You can not subscribe OK?, DAFUQ');
      }else if(deviceData[0].devices[0].device_type == 'Subscriber' || deviceData[0].devices[0].device_type == 'Both'){
        console.log('You can subscribe OK?');
        callback(null, client.username_broker == topic.split('/')[0])
      }
    })
  }
}

io.sockets.on("connection", function(socket){
  socket.emit('send id', socket.id);
  console.log(socket.id);

  socket.on("deleteHistoryTopic", function(data){
    io.sockets.emit("unsubtopic", data);
    console.log(data);
  })

  socket.on("closeConnect", function(deviceId){
    if(server.clients[deviceId] != undefined){
      server.clients[deviceId].close();
    }
  })
  // console.log(currentSocket.id)
  // console.log(Object.keys(io.sockets.connected));
})

server.on('clientConnected', function(client) {
  // console.log(server.servers[0]._connections);
  // console.log(server);
  console.log(server.servers[1]);
  countAuthenDeviceConnected++;
  io.sockets.emit('countAuthenDeviceConnected', countAuthenDeviceConnected);

  userDB.find({email: client.user , "devices.device_id": client.id}, function(err,userData){
    console.log(userData.length);
    if(userData.length != 0){
      userDB.update({email: client.user , "devices.device_id": client.id}, {$set : {"devices.$.status" : "connect"}}, function(err,updateStatus){
        userDB.find({email: client.user , "devices.device_id": client.id}, {"devices.device_id.$": client.id} , function(err,deviceData){
          client.deviceStatus[deviceData[0].devices[0].device_id] = deviceData[0].devices[0].status;
          console.log(client.deviceStatus);
          console.log(deviceData[0].devices[0]);
          io.sockets.emit("deviceStatus", {user: client.user, clientId: deviceData[0].devices[0].device_id, deviceStatus :client.deviceStatus});
        })
      })
    }
  })
  console.log('Authen Broker -----> client connected', client.id , '\n');
});

// fired when a client is disconnected
server.on('clientDisconnected', function(client) {
  console.log(server.servers[1]);
  countAuthenDeviceConnected--;
  io.sockets.emit('countAuthenDeviceConnected', countAuthenDeviceConnected);

  userDB.find({email: client.user , "devices.device_id": client.id}, function(err,userData){
      console.log(userData.length);
      if(userData.length != 0){
        userDB.update({email: client.user , "devices.device_id": client.id}, {$set : {"devices.$.status" : "disconnect"}}, function(err,userData){
          userDB.find({email: client.user , "devices.device_id": client.id}, {"devices.device_id.$": client.id} , function(err,deviceData){
            client.deviceStatus[deviceData[0].devices[0].device_id] = deviceData[0].devices[0].status;
            console.log(client.deviceStatus);
            console.log(deviceData[0].devices[0]);
            io.sockets.emit("deviceStatus", {user: client.user, clientId: deviceData[0].devices[0].device_id, deviceStatus :client.deviceStatus});
          })
        })
      }
    })
  console.log('Authen Broker -----> clientDisconnected : ', client.id , '\n');
});

// fired when a message is received
server.on('published', function(packet, client) {
  if (packet.length > 0) {
    countAuthenMessagePublish++;
    io.sockets.emit('countAuthenMessagePublish', countAuthenMessagePublish);
    
    var subscriber = [];
    for(var key in server.clients){
      if(server.clients[key].subscriptions[packet.topic] != undefined){
        console.log(server.clients[key].id);
        subscriber.push(server.clients[key].id);
      }
    }

    if (client.id.split('_')[0] != 'web'){
      userDB.find({email: client.user , "devices.device_id": client.id}, {"devices.device_id.$": client.id}, function(err,deviceData){
        if(deviceData.length > 0){
          var newMessage = new messageDB ({ email: client.user ,
                     project_id: deviceData[0].devices[0].project_id ,
                     device_id: client.id ,
                     topic: packet.topic ,
                     payload: packet.payload.toString(),
                     subscriber: subscriber
                  });

          newMessage.save(function (err){
            if (err) {
              console.log('add newMessage fail');
            }else{
              io.sockets.emit(client.id ,{payload: packet.payload.toString(), topic: packet.topic, date: Date()});
              io.sockets.emit(packet.topic, {payload: packet.payload.toString(), topic: packet.topic, date: Date()});
              console.log('add newMessage success');
            }
          });
        }
      })
    }else{
      var newMessage = new messageDB ({ device_id: client.id ,
                     topic: packet.topic ,
                     payload: packet.payload.toString(),
                     subscriber: subscriber
                  });

      newMessage.save(function (err){
            if (err) {
              console.log('add newMessage fail');
            }else{
              io.sockets.emit(client.id ,{payload: packet.payload.toString(), topic: packet.topic, date: Date()});
              io.sockets.emit(packet.topic, {payload: packet.payload.toString(), topic: packet.topic, date: Date()});
              console.log('add newMessage success');
            }
          });
    }
    
    // console.log(packet.length);
    // console.log(packet);
    // console.log(client.id);
    // console.log(client.user);
  }

  console.log('Authen Broker -----> Published to topic : ' ,packet.topic , '\nAuthen Broker -----> Published message : ', packet.payload.toString() , '\n');
});

server.on('subscribed', function(topic, client) {
  for(var key in server.clients){
    console.log(server.clients[key].subscriptions);
  }
  if (client.id.split('_')[0] != 'web'){
    var subscribe;
    userDB.find({email: client.user , "devices.device_id": client.id}, {"devices.device_id.$": client.id}, function(err,userData){
      subscribe = userData[0].devices[0].subscribe;
      // console.log('testtttttttttttttt : '+userData[0].devices[0].subscribe);
      // console.log(subscribe.length);
      // console.log(subscribe.indexOf(topic));

      if(subscribe.indexOf(topic) == -1){
        userDB.update({'email': client.user , 'devices.device_id': client.id},{$push:{'devices.$.subscribe': topic}},
                          function(err){
                            if(err){
                              console.log('add subscribe fail');
                            }else{
                              console.log('add subscribe success');
                            }
                          });
      }
    })
    io.sockets.emit('subtopic', {topic: topic, deviceId: client.id});
  }

  console.log('Authen Broker -----> subscribed : ', topic , '\n');
});

server.on('unsubscribed', function(topic, client) {
  userDB.update({'email': client.user ,'devices.device_id': client.id},{$pull:{'devices.$.subscribe': topic}},
                      function(err){
                        if(err){
                          console.log('remove subscribe fail');
                        }else{
                          io.sockets.emit('unsubtopic', {topic: topic});
                          console.log('remove subscribe success');
                        }
                      });
  if (client.id.split('_')[0] != 'web'){
    io.sockets.emit('unsubtopic', {topic: topic, deviceId: client.id});
  }
  console.log('Authen Broker -----> unsubscribed : ', topic , '\n');
});

// fired when a client is disconnecting
server.on('clientDisconnecting', function(client) {
  console.log('Authen Broker -----> clientDisconnecting : ', client.id , '\n');
});

server.on('ready', setup);

// fired when the mqtt server is ready
function setup() {
  server.authenticate = authenticate;
  server.authorizePublish = authorizePublish;
  server.authorizeSubscribe = authorizeSubscribe;
  userDB.find({},function(err,userData){
    console.log(userData[1]._id);
    for(var i=0; i < userData.length; i++){
      // console.log(userData[i].devices);
      for(var j=0; j < userData[i].devices.length; j++){
        var item_update = {'$set':{}}
        item_update['$set']['devices.'+j+'.status'] = 'disconnect';
        userDB.update({"_id":userData[i]._id},item_update, function(err){
          console.log(err);
        });
        
      }
    }
    console.log('update disconnect status')
  })
  io.sockets.emit('restartServer' , 'disconnect');
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

// module.exports = router;
