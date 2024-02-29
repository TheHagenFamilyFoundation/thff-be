/**
 * FullProposal.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    organization: {
      model: 'organization',
    },
    loi: {
      model: 'loi',
    },
    fpID: {
      type: 'string',
    },
    executiveSummary: {
      type: 'string',
    },
    targetPopulation: {
      type: 'string',
    },
    goals: {
      type: 'string',
    },
    activity: {
      type: 'number',
      defaultsTo: 1,
      // values
      // 1-new
      // 2-ongoing
    },
    timeTable: {
      type: 'string',
    },
    partners: {
      type: 'string',
    },
    differ: {
      // differs from other projects in organization and outside
      type: 'string',
    },
    involve: {
      type: 'string',
    },
    staff: {
      type: 'string',
    },
    strategy: {
      type: 'string',
    },
    evaluation: {
      type: 'string',
    },
    dissemination: {
      type: 'string',
    },
    active: {
      type: 'string',
    },
    priority: {
      type: 'string',
    },
    history: {
      type: 'string',
    },
    website: {
      type: 'string',
    },
    submitted: {
      type: 'boolean',
      defaultsTo: false,
    },
    submittedOn: {
      type: 'string',
    },
    status: {
      type: 'number',
      defaultsTo: 1,

      // values:
      // 1-created
      // 2- submitted
      // 3-under review //where people are looking at it
      // 4-reviewed //done reviewing - we'll release the full proposal
      // 5-declined //not for second round
      // 6-need some indicator for second round - show the full proposal link

    },
    fpItems: {
      collection: 'FullProposalItem',
      via: 'fp',
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝


    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

  },

};
