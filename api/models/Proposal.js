/**
 * Proposal.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    organization: {
      model: "organization",
    },
    proposalID: {
      type: "string",
    },
    //   Project Title
    projectTitle: {
      type: "string",
    },
    // Purpose
    purpose: {
      //2000 characters maximum
      type: "string",
    },
    // Goals
    goals: {
      type: "string",
    },
    // Project Narrative - Describe, in detail, the project with emphasis on the following: (1) description of any partners in the project; (2) key staff; (3) involvement of constituents; (4) strategy for long term funding; and (5) plans for evaluation and dissemination.
    narrative: {
      type: "string",
      //4000 characters, a big piece
    },
    // Timetable
    timeTable: {
      type: "string",
    },
    // Amount Requested
    amountRequested: {
      type: "number",
    },
    // Total Project Cost
    totalProjectCost: {
      type: "number",
    },
    itemizedBudget: {
      type: "string",
    },
    votes: {
      collection: 'vote',
      via: 'prop',
    },
    score: {
      type: 'number',
    },
    sponsor: {
      model: 'user',
    },
  },
};
