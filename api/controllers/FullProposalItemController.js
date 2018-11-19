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

};

