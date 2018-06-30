const nconf = require('nconf');
const Redis = require('ioredis');
const mime = require('mime-types');
const express = require('express');
const bodyParser = require('body-parser');

module.exports = (config) => {
    config = config || {};
    const self = this;
    self.app = express();
    self.app.use(bodyParser.json());

    self.app.get('/', (req, res) => {
        res.status(200);
        res.contentType(mime.lookup('json'));
        res.end(JSON.stringify({
                                   status: 'up',
                                   uptime: process.uptime(),
                                   description: "Http wrapper for ioredis"
                               }, null, 2));
    });


    const badRequest = (res, req) => {
        res.status(400);
        res.contentType(mime.lookup('json'));
        res.end(JSON.stringify({params: req.params, query: req.query}, null, 2));
    };

    self.app.get('/:command/:key*', (req, res) => {
        const handler = fetchCommandsHandler[req.params.command];
        if (!handler) return badRequest(res, req);
        handler(res, req);
    });

    self.app.put('/:command/:key*', (req, res) => {
        const handler = updateCommandHandler[req.params.command];
        if (!handler) return badRequest(res, req);
        handler(res, req);
    });

    const fetchCommandsHandler = {
        keys: (res, req) => {
            const pattern = `${req.params.key}${req.params['0']}`;
            self.redis.keys(pattern, (err, result) => {
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
            self.redis.scan(req.query.cursor || 0, "MATCH", pattern, "COUNT", req.query.count || 100, (err, result) => {
                if (err) {
                    res.status(500);
                    return res.end(err.message);
                }
                res.status(200);
                res.contentType(mime.lookup('json'));
                res.end(JSON.stringify(result && result.length > 1 && result[1] || [], null, 2));
            })
        },
        get: (res, req) => {
            const key = `${req.params.key}${req.params['0']}`;
            self.redis.get(key, (err, result) => {
                if (err) {
                    res.status(500);
                    return res.end(err.message);
                }
                res.status(result && 200 || 404);
                res.contentType(mime.lookup('json'));
                res.end(result && parseJsonOrReturnBody(result) || notFoundBody(key));
            })
        }
    };

    const parseJsonOrReturnBody = (body) => {
        try {
            return JSON.stringify(JSON.parse(body), null, 2);
        } catch (e) {
            return body;
        }
    };

    const notFoundBody = (key) => JSON.stringify({status: "NOT_FOUNT", key: key}, null, 2);

    const updateCommandHandler = {
        set: (res, req) => {
            const key = `${req.params.key}${req.params['0']}`;
            try {
                const value = JSON.stringify(req.body);
                self.redis.set(key, value, function (err) {
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
    self.env = nconf.defaults(config).argv().env();
    const getEnv = (variable, _default) => self.env.get(variable) || _default;

    const connect = (config) => {
        self.env = nconf.defaults(config).argv().env();
        const host = getEnv('REDIS_HOST', '127.0.0.1');
        const redisPort = getEnv('REDIS_PORT', 6379);
        const auth = getEnv('REDIS_AUTH', '');
        const db = getEnv('REDIS_DB', 0);
        self.redis = new Redis(`redis://:${auth}@${host}:${redisPort}/${db}`);
    };

    return {
        reload: connect,
        start: (cb) => {
            connect(config);
            const port = getEnv('HTTP_PORT', 7369);
            self.server = self.app.listen(port, function (err) {
                console.log(err || `HTTPEDIS started and listening on ${port}`);
                return cb && cb();
            })
        },
        stop: (cb) => self.server.close(function (err) {
            console.log(err || `Stopping HTTPEDIS`);
            return cb && cb();
        })
    }
};