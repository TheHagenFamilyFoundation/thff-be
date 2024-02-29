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
