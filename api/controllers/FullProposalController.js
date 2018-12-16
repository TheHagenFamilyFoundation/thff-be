/**
 * FullProposalController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

    create: function (req, res, next) {

        sails.log("full proposal create");

        sails.log('req.body', req.body)

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

        Organization.find(query).then(function (org, err) {

            sails.log('found org', org)
            sails.log('found org', org[0].id)

            fp.organization = org[0].id;

            sails.log(fp)

            FullProposal.create(fp).then(function (newFP, err) {
                sails.log("FullProposal.create")

                if (err) {
                    return res.status(err.status).json({ err: err });
                }

                // fp is filled with organization new data..
                sails.log("FP data has been created", newFP, orgID);

                return res.json({ 'status': true, 'result': newFP });

            })

        })

    },

};
