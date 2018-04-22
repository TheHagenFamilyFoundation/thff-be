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

        let userId = req.body.userid;

        Organization.create(req.body).exec(function (err, org) {

            sails.log("Organization.create")

            if (err) {
                return res.json(err.status, { err: err });
            }

            // org is filled with user new data..
            sails.log("Organization data has been created", org, userId);

            // Adding users to org (userId has a value here);
            org.users.add(userId);

            // Save
            org.save(function (err) { console.log('err', err) });
        });

    }

};

