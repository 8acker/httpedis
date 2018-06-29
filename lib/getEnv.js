const env = require("nconf").argv().env();

module.exports = function (variable, _default) {
    return env.get(variable) || _default;
};