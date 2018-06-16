/**
 * OrganizationInfoController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

    create: function (req, res, next) {

        sails.log("organization info create");

        sails.log('req.body', req.body)

        var orgInfo = req.body;

        //create orgInfoID
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        var organizationInfoID = text;
        //add organizationInfoID to orgInfo object

        orgInfo.organizationInfoID = organizationInfoID;

        OrganizationInfo.create(orgInfo).then(function (newOrgInfo, err) {
            sails.log("OrganizationInfo.create")

            if (err) {
                return res.status(err.status).json({ err: err });
            }

            return res.json({ 'status': true, 'result': newOrgInfo });

        })

    }


};

