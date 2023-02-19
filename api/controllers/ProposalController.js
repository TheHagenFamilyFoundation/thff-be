/**
 * ProposalController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const ProposalItemController = require("./ProposalItemController");

module.exports = {
  async create(req, res, next) {
    //req.body will consist of both the proposal object and the proposal items
    sails.log.debug("creating proposal", req.body);

    let proposal = req.body;
    sails.log.debug("proposal", proposal);

    //create the proposal
    //get proposalID
    let newID = await sails.helpers.idGenerator();
    sails.log.debug("newID", newID);
    proposal.proposalID = newID;
    let newProposal = null;
    try {
      //create proposal
      newProposal = await Proposal.create(proposal);
      sails.log.debug("newProposal - ", newProposal);
      //   throw new Error("Test Error");
    } catch (err) {
      sails.log.error(err);
      return res.status(400).send({ code: "PROP001", message: err.message });
    }

    //return the proposal, frontend will send user to the view proposal page
    return res.status(200).send(newProposal);
  },
};
