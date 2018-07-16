/**
 * LOI.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    name: {
      type: 'string',
      //required: 'true',
      unique: true // Yes unique one
    },
    description: {
      type: 'string'
    },
    loiID: {
      type: 'string'
    },
    organization: {
      model: 'organization'
    },
    userid: {
      type: 'string'
    },
    submitted: {
      type: 'boolean',
      defaultsTo: false
    },
    submittedOn: {
      type: 'string'
    },
    info: {
      collection: 'loiInfo',
      via: 'loi'
    },
    status: {
      type: 'string',
      defaultsTo: 'created'

      //values: 
      //created
      // submitted
      //under review //where people are looking at it
      // reviewed //done reviewing - we'll release the full proposal
      // declined //not for second round
      // need some indicator for second round - show the full proposal link


    }


  }
};

