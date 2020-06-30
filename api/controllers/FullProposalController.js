/**
 * FullProposalController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const FullProposalItemController = require('./FullProposalItemController');

module.exports = {

  create(req, res, next) {
    sails.log('full proposal create');

    sails.log('before req.body', req.body);

    const { fpItems } = req.body;

    delete req.body.fpItems;
    sails.log('after req.body', req.body);
    const fp = req.body; // fp

    const orgID = fp.org;

    // create fpID
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < 5; i += 1) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    const fpID = text;
    // add fpID to fp object - fp

    fp.fpID = fpID;

    const query = {};
    query.organizationID = orgID;

    let newFP = null;

    Organization.find(query)
      .then((org) => {
        sails.log('found org', org);
        sails.log('found org', org[0].id);

        fp.organization = org[0].id;

        sails.log(fp);

        return FullProposal.create(fp);
      }).then((createdFp) => {
        newFP = createdFp;
        sails.log('FullProposal.create');

        // fp is filled with organization new data..
        sails.log('FP data has been created', newFP, orgID);

        sails.log('now create FPItems', fpItems);

        const promises = [];
        fpItems.forEach((fpItem) => {
          const createFPItem = fpItem;
          createFPItem.fp = newFP.id;

          promises.push(FullProposalItemController.createFPItem(createFPItem));
        });


        return Promise.all(promises);
      }).then(() => res.json({ status: true, result: newFP }))
      .catch((err) => {
        sails.log('err', err);
        return res.status(err.status).json({ err });
      });
  },

  async find(req, res, next) {
    sails.log.debug('getting the full proposals');

    sails.log.debug('req.query', req.query);
    const query = {};
    if (req.query.year) {
      query.createdAt = {
        '>=': new Date(req.query.year, 0, 1),
      };
    }

    const fullProposals = await FullProposal.find(query)
      .populate('fpItems')
      .populate('organization')
      .populate('loi');
    return res.status(200).send(fullProposals);
  },

  async update(req, res, next) {
    sails.log('fp update', req.body);

    const fp = req.body;

    const { newfpItems } = req.body;
    delete req.body.newfpItems;

    const updatedFP = await FullProposal.update({ id: fp.id }, fp);

    sails.log('updatedFP', updatedFP);

    sails.log('now create FPItems', newfpItems);

    const promises = [];
    newfpItems.forEach((fpItem) => {
      if (!fpItem.fpItemID) {
        const createFPItem = fpItem;
        sails.log('updatedFP.id', updatedFP[0].id);
        createFPItem.fp = updatedFP[0].id;

        promises.push(FullProposalItemController.createFPItem(createFPItem));
      }
    });

    Promise.all(promises).then(
      () => res.json({ status: true, result: updatedFP }),
    );
  },

};
