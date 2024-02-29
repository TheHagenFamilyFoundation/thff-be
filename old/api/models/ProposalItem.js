/**
 * ProposalItem.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    pItemID: {
      type: "string",
    },
    categoryDescription: {
      type: "string",
    },
    amountRequestedTHFF: {
      type: "number",
    },
    amountRequested: {
      type: "number",
    },
    amountPending: {
      type: "number",
    },
    total: {
      type: "number",
    },
    prop: {
      model: "Proposal",
      unique: true,
    },
  },
};
