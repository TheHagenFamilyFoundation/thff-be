/**
 * VoteController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

  create: async function (req, res) {

    sails.log('vote create', req.body)

    const { prop, userID } = req.body;

    let query = {
      prop,
      userID
    }

    try {
      await Vote.destroy(query)
    }
    catch (err) {
      sails.log.error("Error Deleting Vote");
      sails.log.error(err);
      return res.status(400).send({ code: "VOT003", message: err.message });
    }

    try {
      await Vote.create(req.body);
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

  }

};

