/**
 * ProposalItemController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
  create: async function (req, res, next) {
    sails.log("pItem create");

    sails.log("req.body", req.body);

    let pItem = req.body;

    let pItemID = await sails.helpers.idGenerator();
    //add pItemID to fpItem object

    pItem.pItemID = pItemID;

    let newProposalItem = null;
    try {
      newProposalItem = await ProposalItem.create(pItem);
    } catch (err) {
      //error creating a proposal item
      return res.status(400).send({ code: "PITEM001", message: err.message });
    }

    return res.status(200).send(newProposalItem);
  },

  //used in the proposal creation
  createPItem(pItem) {
    return new Promise(async (resolve, reject) => {
      sails.log("createPItem", pItem);

      //create pItemID

      let pItemID = await sails.helpers.idGenerator();
      //add pItemID to pItem object

      pItem.pItemID = pItemID;

      try {
        let newpItem = await ProposalItem.create(pItem);
        return resolve(newpItem);
      } catch (err) {
        //error creating proposal item
        //just 1 proposal item
        sails.log.error(err);
        // return res.status(400).send({ code: "PITEM001", message: err.message });
        //reject
        //send reject
        return reject(err);
      }
    });
  },
};
