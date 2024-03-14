/**
 * VoteloiController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

  async migrate(req, res) {

    sails.log('migrating vote letter of intents ');

    let voteLois = await Voteloi.find().populate('letterOfIntent');
    const length = voteLois.length;
    sails.log('length', length);
    sails.log('voteLois[0]', voteLois[0]);
    const newVoteLois = [];
    voteLois.forEach((voteLoi) => {

      const newVoteLoi = {
        _id: voteLoi.id,
        createdAt: voteLoi.createdAt,
        updatedAt: voteLoi.updatedAt,
        letterOfIntent: voteLoi?.letterOfIntent?.id,
        userID: voteLoi.userID,
        voteType: voteLoi.voteType,
        vote: voteLoi.vote
      };

      newVoteLois.push(newVoteLoi);
    });
    const afterLength = newVoteLois.length;
    sails.log('afterLength', afterLength);
    return res.status(200).json(newVoteLois);
  }

};

