/**
 * OrganizationsController
 *
 * @description :: Server-side logic for managing organizations
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

    create: function (req, res, next) {

        sails.log("organization create");

        sails.log('req.body', req.body)

        var org = req.body;

        let userId = org.userid;

        //create orgID
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        var organizationID = text;
        //add organizationID to org object

        org.organizationID = organizationID;

        Organization.create(org)
            .then(function (newOrg, err) {

                if (err) {
                    return res.status(err.status).json({ err: err });
                }

                sails.log(newOrg)

                Organization.addToCollection(newOrg.id, 'users').members(userId).then(function () {

                    sails.log(newOrg)

                    return res.json({ 'status': true, 'result': newOrg });
                })

            })

    }

};

