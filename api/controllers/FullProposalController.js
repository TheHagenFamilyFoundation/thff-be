/**
 * FullProposalController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

var FullProposalItemController = require('./FullProposalItemController')

module.exports = {

    create: function (req, res, next) {

        sails.log("full proposal create");

        sails.log('before req.body', req.body)

        var fpItems = req.body.fpItems;

        delete req.body.fpItems;
        sails.log('after req.body', req.body)
        var fp = req.body; //fp

        let orgID = fp.org;

        //create fpID
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        var fpID = text;
        //add fpID to fp object - fp

        fp.fpID = fpID;

        let query = {};
        query.organizationID = orgID;

        let newFP = null;

        Organization.find(query)
            .then((org) => {

                sails.log('found org', org)
                sails.log('found org', org[0].id)

                fp.organization = org[0].id;

                sails.log(fp)

                return FullProposal.create(fp)
            }).then((fp) => {
                newFP = fp;
                sails.log("FullProposal.create")

                // fp is filled with organization new data..
                sails.log("FP data has been created", newFP, orgID);

                sails.log('now create FPItems', fpItems)

                let promises = [];
                fpItems.forEach(fpItem => {
                    let createFPItem = fpItem;
                    createFPItem.fp = newFP.id;

                    promises.push(FullProposalItemController.createFPItem(createFPItem))

                });


                return Promise.all(promises)


            }).then(() => {

                return res.json({ 'status': true, 'result': newFP });
            }).catch((err) => {
                sails.log('err', err)
                return res.status(err.status).json({ err: err });
            })

    },

    update: async function (req, res, next) {

        sails.log("fp update", req.body);

        let fp = req.body;

        let newfpItems = req.body.newfpItems;
        delete req.body.newfpItems;

        let updatedFP = await FullProposal.update({ id: fp.id }, fp)

        sails.log('updatedFP', updatedFP)

        sails.log('now create FPItems', newfpItems)

        let promises = [];
        newfpItems.forEach(fpItem => {

            if (!fpItem.fpItemID) {

                let createFPItem = fpItem;
                sails.log('updatedFP.id', updatedFP[0].id)
                createFPItem.fp = updatedFP[0].id;

                promises.push(FullProposalItemController.createFPItem(createFPItem))

            }

        });

        Promise.all(promises).then(
            () => {
                return res.json({ 'status': true, 'result': updatedFP });
            })

    }

};
