/**
 * FullProposalItemsController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

  create: async function (req, res, next) {

    sails.log("fpItem create");

    sails.log('req.body', req.body)

    var fpItem = req.body;

    //create fpItemID
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    var fpItemID = text;
    //add fpItemID to fpItem object

    fpItem.fpItemID = fpItemID;

    FullProposalItem.create(fpItem).then(function (newfpItem, err) {
      sails.log("FullProposalItem.create")

      if (err) {
        return res.status(err.status).json({ err: err });
      }

      return res.json({ 'status': true, 'result': newfpItem });

    })

  },

  createFPItems: async function (req, res, next) {

    sails.log('createFPItems')

    sails.log('req.body', req.body)
    let fpItems = req.body.fpItems;

    let promises = [];

    fpItems.forEach((fpItem) => {

      //create fpItemID
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < 5; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      var fpItemID = text;
      //add fpItemID to fpItem object

      fpItem.fpItemID = fpItemID;
      fpItem.fp = req.body.fp;

      promises.push(createFPItem(fpItem));

    })

    sails.log('fpItems', fpItems)

    await Promise.all(promises).catch(err => {
      return res.status(err.status).json({ err: err });
    })

    sails.log('after - fpItems', fpItems)

    return res.status(200).json(fpItems);
  },

  createFPItem(fpi) {

    return new Promise((resolve, reject) => {

      sails.log('createFPItem', fpi)

      //create fpItemID
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < 5; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      var fpItemID = text;
      //add fpItemID to fpItem object

      fpi.fpItemID = fpItemID;

      FullProposalItem.create(fpi).then(function (newfpItem, err) {
        sails.log("FullProposalItem.create")

        if (err) {
          reject(err);
        }

        resolve();

      })

    })

  },

  async migrate(req, res) {

    sails.log('migrating full proposal items');

    let fullProposalItems = await FullProposalItem.find().populate('fp');
    const length = fullProposalItems.length;
    sails.log('length', length);
    sails.log('fullProposalItems[0]', fullProposalItems[0]);
    const newFullProposalItems = [];
    fullProposalItems.forEach((fullProposalItem) => {

      const newFullProposalItem = {
        _id: fullProposalItem.id,
        createdAt: fullProposalItem.createdAt,
        updatedAt: fullProposalItem.updatedAt,
        fullProposalItemID: fullProposalItem.Year,
        categoryDescription: fullProposalItem.categoryDescription,
        amountRequestedTHFF: fullProposalItem.amountRequestedTHFF,
        amountRequested: fullProposalItem.amountRequested,
        amountPending: fullProposalItem.amountPending,
        total: fullProposalItem.total,
        fullProposal: fullProposalItem.fp.id
      };

      newFullProposalItems.push(newFullProposalItem);
    });
    const afterLength = newFullProposalItems.length;
    sails.log('afterLength', afterLength);
    return res.status(200).json(newFullProposalItems);
  }

}

function createFPItem(fpi) {

  sails.log('createFPItem', fpi)

  return new Promise((resolve, reject) => {
    FullProposalItem.create(fpi).then(function (newfpItem, err) {
      sails.log("FullProposalItem.create")

      if (err) {
        return res.status(err.status).json({ err: err });
      }

      // return res.json({ 'status': true, 'result': newfpItem });

      resolve();

    })

  })

}
