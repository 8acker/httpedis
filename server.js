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

const badRequest = (res, req) => {
    res.status(400);
    res.contentType(mime.lookup('json'));
    res.end(JSON.stringify({params: req.params, query: req.query}, null, 2));
};

app.get('/:command/:key*', (req, res) => {
    const handler = fetchCommandsHandler[req.params.command];
    if (!handler) return badRequest(res, req);
    handler(res, req);
});

app.put('/:command/:key*', (req, res) => {
    const handler = updateCommandHandler[req.params.command];
    if (!handler) return badRequest(res, req);
    handler(res, req);
});

const fetchCommandsHandler = {
    keys: (res, req) => {
        const pattern = `${req.params.key}${req.params['0']}`;
        redis.keys(pattern, (err, result) => {
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
    scan: (res, req) => {
        const pattern = `${req.params.key}${req.params['0']}`;
        redis.scan(req.query.cursor || 0, "MATCH", pattern, "COUNT", req.query.count || 100, (err, result) => {
            if (err) {
                res.status(500);
                return res.end(err.message);
            }
            res.status(200);
            res.contentType(mime.lookup('json'));
            res.end(JSON.stringify(result && result.length > 1 && result[1], null, 2));
        })
    },
    get: (res, req) => {
        const key = `${req.params.key}${req.params['0']}`;
        redis.get(key, (err, result) => {
            if (err) {
                res.status(500);
                return res.end(err.message);
            }
            res.status(200);
            res.contentType(mime.lookup('json'));
            res.end(result && JSON.stringify(JSON.parse(result), null, 2) || result);
        })
    }
};

const updateCommandHandler = {
    set: (res, req) => {
        const key = `${req.params.key}${req.params['0']}`;
        try {
            const value = JSON.stringify(req.body);
            redis.set(key, value, function (err) {
                if (err) {
                    res.status(500);
                    return res.end(err.message);
                }
                res.status(200);
                res.contentType(mime.lookup('json'));
                res.end(JSON.stringify({key: key, value: body}, null, 2));
            })
        } catch (e) {
            res.status(400);
            res.end(err.message);
        }
    }
};

const port = getEnv('HTTP_PORT', 7369);
app.listen(port, function (err) {
    console.log(err || `httpedis started and listening on ${port}`)
});