/**
 * VoteController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const ProposalController = require("./ProposalController");

module.exports = {

  create: async function (req, res) {

    sails.log('vote create', req.body)

    const { prop, userID } = req.body;

    let query = {
      prop,
      userID
    }

    try {
      await Vote.destroy(query);
      await ProposalController.recalculatePropScore(prop);
    }
    catch (err) {
      sails.log.error("Error Deleting Vote");
      sails.log.error(err);
      return res.status(400).send({ code: "VOT003", message: err.message });
    }

    try {
      await Vote.create(req.body);
      await ProposalController.recalculatePropScore(prop);

    }
    catch (err) {
      sails.log.error("Error Creating Vote");
      sails.log.error(err);
      return res.status(400).send({ code: "VOT001", message: err.message });
    }

    try {
      let find = await Vote.findOne(query).populate('prop');
      sails.log('after - find', find)
      return res.status(200).json(find);
    }
    catch (err) {
      sails.log.error("Error Retrieving Vote");
      sails.log.error(err);
      return res.status(400).send({ code: "VOT002", message: err.message });
    }

  },

  async migrate(req, res) {

    sails.log('migrating votes ');

    let votes = await Vote.find();
    const length = votes.length;
    sails.log('length', length);

    const newVotes = [];
    votes.forEach((vote) => {
      console.log('vote', vote)
      const newVote = {
        _id: vote.id,
        createdAt: vote.createdAt,
        updatedAt: vote.updatedAt,
        userID: vote.userID,
        vote: vote.vote,
        prop: vote.prop

      };

      newVotes.push(newVote);
    });
    const afterLength = newVotes.length;
    sails.log('afterLength', afterLength);
    return res.status(200).json(newVotes);
  }


};

