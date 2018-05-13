/**
 * OrganizationsController
 *
 * @description :: Server-side logic for managing organizations
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

    create: function (req, res) {

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

        Organization.create(org).exec(function (err, org) {

            sails.log("Organization.create")

            if (err) {
                return res.json(err.status, { err: err });
            }

            // org is filled with user new data..
            sails.log("Organization data has been created", org, userId);

            // Adding users to org (userId has a value here);
            org.users.addToCollection(userId);

            // Save
            org.replaceCollection(function (err) { console.log('err', err) });
        });

    }

};

