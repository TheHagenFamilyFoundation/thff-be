/**
 * ProposalController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

// const ProposalItemController = require("./ProposalItemController");
const emailController = require("./EmailController");

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

    try {
      await emailController.sendSubmittingProposal(newProposal);
      //return the proposal, frontend will send user to the view proposal page
      return res.status(200).send(newProposal);
    } catch (err) {
      sails.log.error("error in the email sending");
      sails.log.error(err);
      return res.status(400).send({ code: "PROP001", message: err.message });
    }
  },
  update: async function (req, res, next) {
    sails.log.debug("updating proposal", req.query);
    sails.log.debug("updated field", req.body); // check for full update now
    let updatedProposal = await Proposal.updateOne(
      { proposalID: req.query.proposalID },
      req.body
    );

    sails.log.debug("updatedProposal", updatedProposal);

    return res.status(200).json({
      message: "Proposal Updated",
      proposal: updatedProposal,
    });
  },
  async countProposals(req, res) {
    try {
      let { filter } = req.query;

      let query = {};
      if (filter && filter.length !== 0) {
        query.where = { name: { contains: filter } };
      }
      let count = await Proposal.count(query);
      return res.status(200).json(count);
    }
    catch (err) {
      sails.log.error("Error Retrieving Proposal Count");
      sails.log.error(err);
      return res.status(400).send({ code: "PROP002", message: err.message });
    }
  },
};
