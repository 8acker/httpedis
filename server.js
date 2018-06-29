const pjson = require('./package');
const Redis = require('ioredis');
const mime = require('mime-types');
const express = require('express');
const bodyParser = require('body-parser');

const env = require("nconf").defaults(pjson.config).argv().env();
const getEnv = (variable, _default) => env.get(variable) || _default;

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

app.use(bodyParser.json());

app.get('/:command/:key*', (req, res) => {
    const key = `${req.params.key}${req.params['0']}`;
    getFetchCommandHandler(req.params.command)(key, res, req.params.command);
});

app.put('/:command/:key*', (req, res) => {
    const key = `${req.params.key}${req.params['0']}`;
    getUpdateCommandHandler(req.params.command)(key, res, req.params.command, req.body);
});

const getFetchCommandHandler = (command) => fetchCommandsHandler[command] || fetchCommandsHandler._default;

const getUpdateCommandHandler = (command) => updateCommandHandler[command] || updateCommandHandler._default;

const fetchCommandsHandler = {
    keys: (key, res) => {
        redis.keys(key, (err, result) => {
            if (err) {
                res.status(500);
                res.end(err.message);
                return;
            }
            res.status(200);
            res.contentType(mime.lookup('json'));
            res.end(JSON.stringify(result, null, 2));
        })
    },
    _default: (key, res, command) => {
        redis[command](key, (err, result) => {
            if (err) {
                res.status(500);
                res.end(err.message);
            }
            res.status(200);
            res.contentType(mime.lookup('json'));
            res.end(result && JSON.stringify(JSON.parse(result), null, 2) || result);
        })
    }
};

const updateCommandHandler = {
    _default: (key, res, command, body) => {
        try {
            const value = JSON.stringify(body);
            redis[command](key, value, function (err) {
                if (err) {
                    console.error(err.message);
                    res.status(500);
                    res.end(err.message);
                    return;
                }
                res.status(200);
                res.contentType(mime.lookup('json'));
                res.end(JSON.stringify({key: key, value: body}, null, 2));
            })
        } catch (e) {
            console.error(e.message);
            res.status(500);
            res.end(err.message);
        }
    }
};

const port = getEnv('HTTP_PORT', 7369);
app.listen(port, function (err) {
    console.log(err || `httpedis started and listening on ${port}`)
});