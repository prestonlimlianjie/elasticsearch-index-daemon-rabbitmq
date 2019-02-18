#!/usr/bin/env node

const amqp = require('amqplib/callback_api');
const Papa = require('papaparse');
const fs = require('fs');
const S3 = require('aws-sdk/clients/s3');
const queueName = 'vault-dataset-search'

// Basic AWS config
const AWS = require('aws-sdk')
AWS.config.update({
  region: 'ap-southeast-1'
})
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

// Try/catch to check if the S3 bucket exists.
try {
  if (process.env.S3_BUCKET_NAME) bucketName = process.env.S3_BUCKET_NAME
} catch (err) { throw new Error("s3 bucket name not found") }

// Connects to ElasticSearch server
const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace'
});

// generateBulkIndex
// =================
// This function parses the filestream row by row and generates the bulk API body.
// After the bulk API body has been generated, it calls the indexDataset function.
async function generateBulkIndex(fileStream, indexName, indexType) {
  try {
    let bulkIndexBody = []
    let actionDescription = ''
    let indexDoc = ''
    let testStr;
    let rowId = 1;

    return new Promise((resolve) => {
      Papa.parse(fileStream, {
        header: true,
        dynamicTyping: true,
        step: function(row) {
          if (rowId !== 1) {
            bulkIndexBody += ','
          }
          actionDescription = '{ "index":  { "_index": "' + indexName + '", "_type": "' + indexType + '", "_id": ' + rowId + ' } },'
          indexDoc = JSON.stringify(row.data[0])
          bulkIndexBody += actionDescription + indexDoc
          rowId += 1;
        },
        complete: function() {
          bulkIndexBody = JSON.parse('[' + bulkIndexBody + ']')
          resolve(bulkIndexBody)
        }
      })
    })
  } catch(err){
    console.log(err)
  }
};

// indexDataset
// =================
// This function checks if an elasticSearch index with name `indexName` exists.
// If so, it deletes the existing index. Subsequently, it 
// TO-DO: Add a check if the index exists.
async function indexDataset(indexName, indexType, bulkIndexBody) {
  try {
    // Delete the existing ES index

    // If index exists, delete the index before re-indexing
    if (client.indices.exists({index: indexName})) {
      client.indices.delete({
        index: indexName
      }).then(() => {
        // Use the bulk index API to index the new document
        return client.bulk({
          body: bulkIndexBody
        })
      }).catch(err => {
        console.log(err);
      })
    }

    // Else, index
    return client.bulk({
      body: bulkIndexBody
    })

  } catch (err) {
    console.log(err)
  }
}

// Connects and listens to the MQ
function listenToMQ() {
  try {
    amqp.connect('amqp://localhost', function(err, conn) {
      conn.createChannel(function(err, ch) {
        ch.assertQueue(queueName, {durable: false});
        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queueName);
        ch.consume(queueName, async function(msg) {
          let msgObject = JSON.parse(msg.content)
          let keyName = msgObject.keyName
          let indexName = msgObject.indexName
          let indexType = msgObject.indexType

          let params = {
            Bucket: bucketName,
            Key: keyName,
          }

          // Create fileStream from CSV
          let fileStream = s3.getObject(params).createReadStream()

          // Generate the body from fileStream
          let bulkIndexBody = await generateBulkIndex(fileStream, indexName, indexType);
          
          // Add index into elasticSearch
          let esIndexPromise = indexDataset(indexName, indexType, bulkIndexBody);
          
          // Return acknowledgement
          esIndexPromise.then(ch.ack(msg));

        }, {noAck: false});
      });
    });
  }
  catch(err) {
    console.log(err)
  }
}

listenToMQ()