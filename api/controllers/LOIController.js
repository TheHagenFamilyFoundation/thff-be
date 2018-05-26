/**
 * LOIController
 *
 * @description :: Server-side logic for managing LOIS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

    create: function (req, res) {

        sails.log("loi create");

        sails.log('req.body', req.body)

        var loi = req.body; //loi

        let orgID = loi.orgID;

        //create loiID
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        var loiID = text;
        //add loiID to loi object - loi

        loi.loiID = loiID;

        LOI.create(loi).exec(function (err, loi) {

            sails.log("LOI.create")

            if (err) {
                return res.status(err.status).json({ err: err });
            }

            // loi is filled with organization new data..
            sails.log("LOI data has been created", loi, orgID);

            // Adding organization to LOI
            loi.organization = loiID

            // Save
            loi.replaceCollection(function (err) { console.log('err', err) });
        });

    }
};

