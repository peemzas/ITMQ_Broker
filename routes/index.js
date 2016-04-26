var express = require('express');
var router = express.Router();
var io = require('socket.io-client');
var socketAuthen = io.connect('http://neutron.it.kmitl.ac.th:5000',{reconnect: true});
var socketPublic = io.connect('http://neutron.it.kmitl.ac.th:5001',{reconnect: true});

var countAuthenDeviceConnected = 0;
var countAuthenMessagePublish = 0;

var countPublicDeviceConnected = 0;
var countPublicMessagePublish = 0;

socketAuthen.on('countAuthenDeviceConnected', function(data) {
    countAuthenDeviceConnected = data;
    console.log("Authen Connected: " + countAuthenDeviceConnected);
});

socketAuthen.on('countAuthenMessagePublish', function(data) {
    countAuthenMessagePublish = data;
    console.log("Authen All Message: " + countAuthenMessagePublish);
});

socketPublic.on('countPublicDeviceConnected', function(data){
    countPublicDeviceConnected = data;
    console.log("Public Connected: " + countPublicDeviceConnected);
})

socketPublic.on('countPublicMessagePublish', function(data){
    countPublicMessagePublish = data;
    console.log("Public All Message: " + countPublicMessagePublish);
})

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'ITMQ', 
                        countAuthenDeviceConnected: countAuthenDeviceConnected, 
                        countPublicDeviceConnected: countPublicDeviceConnected,
                        countAuthenMessagePublish: countAuthenMessagePublish,
                        countPublicMessagePublish: countPublicMessagePublish});
});

module.exports = router;
