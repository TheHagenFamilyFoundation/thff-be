/**
 * Org501c3.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    fileName: {
      type: 'string',
    },
    url: {
      type: 'string',
    },
    organization: {
      model: 'organization',
      unique: true
    },
    status: {
      type: 'number',
      defaultsTo: 1

      //multiple values
      //1-created
      //2-accepted
      //3-needs changes //needs work

    }

  },

};

