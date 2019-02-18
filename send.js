#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
const queueName = 'vault-dataset-search'

amqp.connect('amqp://localhost', function(err, conn) {
  conn.createChannel(function(err, ch) {
    
    let messageJson = {keyName: 'test.csv', indexName: 'myindex', indexType: 'mytype'}
    var msg = JSON.stringify(messageJson)

    ch.assertQueue(queueName, {durable: false});
    ch.sendToQueue(queueName, Buffer.from(msg));
    console.log(" [x] Sent %s", msg);
  });
  setTimeout(function() { conn.close(); process.exit(0) }, 500);
});