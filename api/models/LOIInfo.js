/**
 * LOIInfo.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    loiID: {
      type: 'string'
    },
    projectTitle: {
      type: 'string'
    },
    Purpose: {
      //2000 characters maximum
      type: 'string'
    },
    projectStartDate: {
      type: 'string'
    },
    projectEndDate: {
      type: 'string'
    },
    AmountRequested: {
      type: 'string'
    },
    totalProjectCost: {
      type: 'string'
    },
    loi: {
      model: 'loi',
      unique: true
    }

  },

};

