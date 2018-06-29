const getEnv = require("nconf").argv().env();

module.exports = function (variable, _default) {
    return getEnv.get(variable) || _default;
};