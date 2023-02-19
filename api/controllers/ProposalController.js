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

    //req.body.proposal
    //req.body.pItems

    const { proposal, pItems } = req.body;
    sails.log.debug("proposal", proposal);
    sails.log.debug("pItems", pItems);

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

    //create the proposal items
    sails.log.debug("creating proposalItems");

    let newProposalId = newProposal.id;

    const promises = [];
    pItems.forEach((pItem) => {
      const createPItem = pItem;
      createPItem.prop = newProposalId;

      promises.push(ProposalItemController.createPItem(createPItem));
    });

    let newpItems = null;

    try {
      //promise.all
      newpItems = await Promise.all(promises);
    } catch (err) {
      //group of items
      //error creating proposal items
      sails.log.error(err);
      return res.status(400).send({ code: "PITEM002", message: err.message });
    }

    //retrieve the proposal object with the new proposal items
    let createdProposal = await Proposal.findOne({ _id: newProposalId });
    createdProposal.pItems = newpItems;

    //return the proposal, frontend will send user to the view proposal page
    return res.status(200).send(createdProposal);
  },
};
