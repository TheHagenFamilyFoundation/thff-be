/**
 * Organizations.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  schema: true,

  attributes: {

    name: {
      type: 'string',
      //required: 'true',
      unique: true // Yes unique one
    },
    director: {
      type: 'string',
      // required: 'true'
    },
    description: {
      type: 'string'
    },
    users: {
      collection: 'user',
      via: 'organizations'
    },
    lois:{
      collection: 'loi',
      via: 'organization'
    },
    organizationID: {
      type: 'string',
    }

  },

};

