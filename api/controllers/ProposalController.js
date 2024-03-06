/**
 * ProposalController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

/* Error Codes
PROP001 - Create Proposal Error
PROP002 - Error Retrieving Proposal Count
PROP003 - Retrieve Proposals Error
PROP004 - Error Updating Proposal Score
PROP005 - Error Calculating Proposal Score
PROP006 - Error Updating Proposal
PROP007
PROP008
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
      //THROW possibly
      sails.log.error("error in the creating proposal");
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
  //handles
  //body update
  //sponsor
  //TODO: combine the query and params
  update: async function (req, res, next) {
    sails.log.debug("updating proposal", req.query);
    sails.log.debug("updated field", req.body); // check for full update now
    sails.log.debug('sponsor', req.params);

    let { id } = req.params;

    //sponsor or update
    if (id) {

      try {
        let updatedProposal = await Proposal.updateOne(
          { id }).set(req.body)

        sails.log.debug("updatedProposal", updatedProposal);

        return res.status(200).json({
          message: "Proposal Updated",
          proposal: updatedProposal,
        });
      }
      catch (err) {
        sails.log.error("Error Updating Proposal - Param");
        sails.log.error(err);
        return res.status(400).send({ code: "PROP006", message: err.message });
      }
    }
    else {
      try {
        let updatedProposal = await Proposal.updateOne(
          { proposalID: req.query.proposalID }).set(req.body);

        sails.log.debug("updatedProposal", updatedProposal);

        return res.status(200).json({
          message: "Proposal Updated",
          proposal: updatedProposal,
        });
      }
      catch (err) {
        sails.log.error("Error Updating Proposal - Query");
        sails.log.error(err);
        return res.status(400).send({ code: "PROP006", message: err.message });
      }
    }

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
        case 'sponsored':
          sails.log.debug('sorting by sponsors');
          proposals.sort(function (a, b) {
            let aSponsor = ((typeof a.sponsor !== 'undefined') && a.sponsor !== null) ? 1 : 0;
            let bSponsor = ((typeof b.sponsor !== 'undefined') && b.sponsor !== null) ? 1 : 0;
            return dir === 'asc' ? (aSponsor - bSponsor) : (bSponsor - aSponsor);
          });
          break;
        case 'votes':
          proposals.sort(function (a, b) {
            return dir === 'asc' ? (a?.votes.length - b?.votes.length) : (b?.votes.length - a?.votes.length);
          });
          break;
        case 'score':
          sails.log.debug('sorting by score');
          proposals.sort(function (a, b) {
            let aScore = (typeof a.score !== 'undefined') ? a.score : 0;
            let bScore = (typeof b.score !== 'undefined') ? b.score : 0;
            return dir === 'asc' ? (aScore - bScore) : (bScore - aScore);
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
  },


  async migrate(req, res) {

    sails.log('migrating proposals ');

    let proposals = await Proposal.find().populate('organization');
    const length = proposals.length;
    sails.log('length', length);

    const newProposals = [];
    proposals.forEach((proposal) => {
      console.log('proposal', proposal)
      if (proposal?.organization?.id) {
        const newProposal = {
          _id: proposal.id,
          createdAt: proposal.createdAt,
          updatedAt: proposal.updatedAt,
          organization: proposal.organization.id,
          proposalID: proposal.proposalID,
          projectTitle: proposal.projectTitle,
          purpose: proposal.purpose,
          goals: proposal.goals,
          narrative: proposal.narrative,
          timeTable: proposal.timeTable,
          amountRequested: proposal.amountRequested,
          totalProjectCost: proposal.totalProjectCost,
          itemizedBudget: proposal.itemizedBudget,
          score: proposal.score,
          sponsor: proposal.sponsor
        };

        newProposals.push(newProposal);
      }
    });
    const afterLength = newProposals.length;
    sails.log('afterLength', afterLength);
    return res.status(200).json(newProposals);
  }


};
