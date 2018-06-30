## ![HttPRedis](https://github.com/tbouchnafa/httpedis/blob/master/assets/httpedis-logo.png)

A HTTP wrapper for `ioredis`

### Install 
```jshelllanguage
npm install httpedis
```
### Usage 

```js
const config = {
    // Redis properties 
    REDIS_HOST: "localhost",
    REDIS_PORT: 6379,
    REDIS_AUTH: "mypassword", 
    REDIS_DB: 0, 
    // Server port
    HTTP_PORT: 9001
};

const httpedis = require('httpedis')(config);

// Starts the server
httpedis.start(optionalCallback);

// Reloading redis connection 
httpedis.reload({REDIS_DB: 1});

// Stopping server 
httpedis.stop(optionalCallback)
```
# Enjoy
```shell 
# GET all keys 
curl -X PUT -d foo=bar "localhost:9001/set/foo" 
curl "localhost:9001/get/foo" 
curl "localhost:9001/keys/*" 
["foo"]
```
