# ElasticSearch Index Daemon with RabbitMQ

## Overview
This repo is a demo for an ElasticSearch indexing daemon that is triggered by a RabbitMQ message. The components used in this example are as follows:
1. A RabbitMQ server that acts as the message broker
2. An ElasticSearch server
3. A Node.js `send.js` script that sends a message containing an AWS S3 `keyName`, `indexName` for the new ElasticSearch index, and `indexType`.
4. A Node.js `receive.js` script that receives the message and does the following:
- Converts the `keyName` CSV file in AWS S3 to a file stream
- Parse the file stream and indexes the file into ElasticSearch

## How to run
You will need 4 terminal windows to run this demo. The demo also assumes that you have installed ElasticSearch, RabbitMQ, and Node.js.

#### Window 1 - ElasticSearch
Run the ElasticSearch server

```
elasticsearch
```

#### Window 2 - RabbitMQ
Run the RabbitMQ server

```
rabbitmq-server
```

#### Window 3 - Receive.js
1. Set up the `.env` file with your AWS credentials and S3 bucket name
2. Install the npm packages and run `receive.js`

```
npm install
node receive.js
```

#### Window 4 - Send.js
```
node send.js
```