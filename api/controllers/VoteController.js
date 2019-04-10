/**
 * VoteController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

    create: async function (req, res) {

        sails.log('vote create', req.body)

        let query = {
            voteType: req.body.voteType,
            letterOfIntent: req.body.letterOfIntent
        }

        let find = await Vote.destroy(query)
        // sails.log('find', find)

        let vote = await Vote.create(req.body);

        sails.log('vote', vote)

        return res.status(200).json(vote);

    }

};

