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
        query.where = { projectTitle: { contains: filter } };
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

  async getProposals(req, res) {
    try {

      let { limit, skip, filter, sort, dir } = req.query;

      let query = {};

      //just filtering on projectTitle right now
      if (filter && filter.length !== 0) {
        query.where = { projectTitle: { contains: filter } };
      }

      let proposals = await Proposal.find(query).populate('organization').populate('votes');

      //sort
      //for notes
      // ASC  -> a.length - b.length
      // DESC -> b.length - a.length
      switch (sort) {

        case 'projectTitle':
          if (dir === 'asc') {
            proposals.sort((a, b) => b.projectTitle.localeCompare(a.projectTitle));
          }
          else {
            proposals.sort((a, b) => a.projectTitle.localeCompare(b.projectTitle))
          }
          break;
        case 'organization': //sort by organization name
          if (dir === 'asc') {
            proposals.sort((a, b) => b.organization?.name.localeCompare(a.organization?.name));
          }
          else {
            proposals.sort((a, b) => a.organization?.name.localeCompare(b.organization?.name))
          }
          break;
          break;
        case 'amountRequested':
          proposals.sort(function (a, b) {
            return dir === 'asc' ? (a.amountRequested - b.amountRequested) : (b.amountRequested - a.amountRequested);
          });
          break;
        case 'totalProjectCost':
          proposals.sort(function (a, b) {
            return dir === 'asc' ? (a.totalProjectCost - b.totalProjectCost) : (b.totalProjectCost - a.totalProjectCost);
          });
          break;
        case 'createdOn':
          proposals.sort(function (a, b) {
            return dir === 'asc' ? (new Date(a.createdAt) - new Date(b.createdAt)) : (new Date(b.createdAt) - new Date(a.createdAt));
          });
          break;
      }

      //skip and limit
      let props = proposals.slice(skip, +skip + +limit);

      return res.status(200).json(props);
    }
    catch (err) {
      sails.log.error("Error Retrieving Proposals");
      sails.log.error(err);
      return res.status(400).send({ code: "PROP003", message: err.message });
    }
  },

  //called from vote controller
  async recalculatePropScore(proposal_id) {

    let proposal = null;
    let score = 0;
    try {
      proposal = await Proposal.findOne({ _id: proposal_id }).populate('votes');
    }
    catch (err) {
      sails.log.error("Error Retrieving Proposal");
      sails.log.error(err);
      return res.status(400).send({ code: "PROP003", message: err.message });
    }
    try {
      score = await this.calculatePropScore(proposal.votes);
    }
    catch (err) {
      sails.log.error("Error Calculating Proposal Score");
      sails.log.error(err);
      return res.status(400).send({ code: "PROP005", message: err.message });
    }
    //update proposal score
    try {
      await Proposal.updateOne({ _id: proposal_id }, { score });
    }
    catch (err) {
      sails.log.error("Error Updating Proposal Score");
      sails.log.error(err);
      return res.status(400).send({ code: "PROP004", message: err.message });
    }
  },

  //utility
  async calculatePropScore(votes) {
    let score = 0;
    votes.forEach(vote => {
      score += score !== -1 ? vote.vote : 0;
    })
    return score;
  }

};
