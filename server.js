const getEnv = require('./lib/getEnv');
const Redis = require('ioredis');
const mime = require('mime-types');
const express = require('express');

const host = getEnv('REDIS_HOST', '127.0.0.1');
const redisPort = getEnv('REDIS_PORT', 6379);
const auth = getEnv('REDIS_AUTH', '');
const db = getEnv('REDIS_DB', 0);
const redis = new Redis(`redis://:${auth}@${host}:${redisPort}/${db}`);

var app = express();

app.get('/', (req, res) => {
    res.status(200);
    res.contentType(mime.lookup('json'));
    res.end(JSON.stringify({status: 'up', uptime: process.uptime(), description: "Http wrapper for ioredis"}, null, 2));
});

app.get('/:command/:key*', (req, res) => {
    const key = req.params.key + (req.params['0'] || '');
    redis[req.params.command](key, function (err, result) {
        res.status(200);
        res.contentType(mime.lookup('json'));
        res.end(JSON.stringify(JSON.parse(result), null, 2));
    })
});

const port = getEnv('HTTP_PORT', 7369);
app.listen(port, function (err) {
    console.log(err || `httpedis started and listening on ${port}`)
});