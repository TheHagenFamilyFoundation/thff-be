/**
 * GrantController
 *
 * @description :: Server-side logic for managing grants
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

    create: function (req, res) {

        sails.log("grant create");

        sails.log('req.body', req.body)

        var gr = req.body; //-grant request

        let orgID = gr.orgID;

        //create grantID
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        var grantID = text;
        //add grantID to gr object - grant request

        gr.grantID = grantID;

        Grant.create(gr).exec(function (err, gr) {

            sails.log("Grant.create")

            if (err) {
                return res.json(err.status, { err: err });
            }

            // gr is filled with organization new data..
            sails.log("Grand Request data has been created", gr, orgID);

            // Adding organization to Grant Request
            gr.organization = orgID

            // Save
            gr.save(function (err) { console.log('err', err) });
        });

    }


};

