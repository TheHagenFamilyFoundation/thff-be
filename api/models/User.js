/**
 * Users.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

// We don't want to store password with out encryption
var bcrypt = require('bcrypt-nodejs');

module.exports = {

  schema: true,

  attributes: {

    email: {
      type: 'string',
      //required: 'true',
      unique: true // Yes unique one
    },
    username: {
      type: 'string',
      //required: 'true',
      unique: true
    },
    name: {
      type: 'string'
    },
    organizations: {
      collection: 'organization',
      via: 'users',
      dominant: true,
    },
    resetCode: {
      type: 'string'
    },
    resetPassword: {
      type: 'boolean'
    },
    resetTime: {
      type: 'ref', columnType: 'datetime'
    },
    encryptedPassword: {
      type: 'string',
      protect: true,
    }
  },
  // We don't wan't to send back encrypted password either
  customToJSON: function () {
    // Return a shallow copy of this record with the password and ssn removed.
    return _.omit(this, ['encryptedPassword', 'resetPassword'])
  },
  // Here we encrypt password before creating a User
  beforeCreate: function (values, next) {
    sails.log("beforeCreate")

    bcrypt.genSalt(10, function (err, salt) {
      if (err) return next(err);

      bcrypt.hash(values.password, salt, null, function (err, hash) {
        if (err) return next(err);

        values.encryptedPassword = hash;
        next();
      })
    })
  },

  comparePassword: function (password, user, cb) {
    bcrypt.compare(password, user.encryptedPassword, function (err, match) {
      if (err) cb(err);
      if (match) {
        cb(null, true);
      } else {
        cb(err);
      }
    })
  }
};