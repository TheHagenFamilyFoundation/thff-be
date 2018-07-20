/**
 * Users.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

// We don't want to store password with out encryption
var bcrypt = require('bcrypt');

const saltRounds = 10;

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
    },
    accessLevel: {
      type:'number',
      defaultsTo: 1
      //1-user
      //2-director
      //3-president
      //4-admin(Logan)
    }
  },
  // We don't wan't to send back encrypted password either
  customToJSON: function () {
    // Return a shallow copy of this record with the password and ssn removed.
    return _.omit(this, ['encryptedPassword', 'resetPassword'])
  },

  comparePassword: function (password, user, cb) {

    sails.log('comparePassword')
    sails.log('password', password)
    sails.log('user', user)


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