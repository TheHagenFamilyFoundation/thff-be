/**
 * Default jobs configuration
 * (sails.config.jobs)
 *
 * For more information using agenda in your app, check out:
 * https://github.com/vbuzzano/sails-hook-jobs
 */

try {

    var locals = require('./local.js');

}
catch (e) {

    console.log('on prod')

}

module.exports.jobs = {
    // Define the directory where jobs are stored
    "jobsDirectory": "api/jobs",
    "db": {
        "address": (process.env.MONGODB_URI) ? process.env.MONGODB_URI : locals.datastores.default.url,
        "collection": "sailsjobs"
    },
    "name": "SailsJs Jobs",
    "processEvery": "10 seconds",
    "maxConcurrency": 20,
    "defaultConcurrency": 10,
    "defaultLockLifetime": 10000

}; 