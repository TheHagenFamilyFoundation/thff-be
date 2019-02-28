/**
 * LOIController
 *
 * @description :: Server-side logic for managing LOIS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var emailController = require('./EmailController')

module.exports = {

    create: function (req, res, next) {

        sails.log("loi create");

        sails.log('req.body', req.body)

        var loi = req.body; //loi

        let orgID = loi.org;

        //create loiID
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        var loiID = text;
        //add loiID to loi object - loi

        loi.loiID = loiID;

        let query = {};
        query.organizationID = orgID;

        Organization.find(query).then(function (org, err) {

            sails.log('found org', org)
            sails.log('found org', org[0].id)

            loi.organization = org[0].id;

            sails.log(loi)

            LOI.create(loi).then(function (newLOI, err) {
                sails.log("LOI.create")

                if (err) {
                    return res.status(err.status).json({ err: err });
                }

                // loi is filled with organization new data..
                sails.log("LOI data has been created", newLOI, orgID);

                return res.json({ 'status': true, 'result': newLOI });

            })

        })

    },
    //flipping the field submitted and update the submittedOn with time stamp
    submitLOI: async function (req, res, next) {

        sails.log('submitLOI', req.params)

        let loiID = req.params.loiID;

        var loi = await LOI.update({ loiID: loiID })
            .set({
                submitted: true,
                submittedOn: (new Date()).toJSON(),
                status: 2 //submitted
            })
            .fetch();

        sails.log('loi', loi)

        var query = { username: loi[0].username }
        var user = await User.find(query);

        var body = {
            user: user[0],
            loi: loi[0]
        }

        var sendEmail = await emailController.sendSubmitLOI(body);

        return res.status(200).json({ message: 'Loi submitted' })
    }

};

