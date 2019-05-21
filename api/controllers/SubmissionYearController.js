/**
 * SubmissionYearController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

    create: async function (req, res, next) {

        sails.log("submission year create");

        sails.log('req.body', req.body)

        var subYear = req.body; //submission year

        //create subID
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        var subID = text;
        //add subID to subyear object

        subYear.subID = subID;

        let query = {
            submitted: true,
            submissionYear: null //unclaimed submissionYears
        }

        let lois = await LOI.find(query)

        subYear.lois = [];
        lois.forEach(loi => {
            subYear.lois.push(loi.id)
        })

        let newSubYear = await SubmissionYear.create(subYear)

        return res.json({ 'status': true, 'result': newSubYear });

    },

    //connected with LOI Controller
    openFullProposalPortal: async function (data) {

        sails.log('openFullProposalPortal', data)

        let query = {
            id: data.id
        }

        //debugging
        // var sy = await SubmissionYear.findOne(query);

        var sy = await SubmissionYear.update(query)
            .set({
                fpPortal: true
            })
            .fetch();

        sails.log('sy', sy) //debuggin

        let result = true;

        return result;

    },

    // //connected with LOI Controller
    closeFullProposalPortal: async function (data) {
        sails.log('closeFullProposalPortal')

        let query = {
            id: data.id
        }

        //debugging
        // var sy = await SubmissionYear.findOne(query);

        var sy = await SubmissionYear.update(query)
            .set({
                fpPortal: false
            })
            .fetch();

        sails.log('sy', sy) //debugging

        let result = true;

        return result;

    },

    closeSubmissionYear: async function (req, res, next) {

        sails.log('closeFullProposalPortal', req.body)

        let query = {
            id: req.body.id
        }

        //debugging
        var sy = await SubmissionYear.findOne(query);

        // var sy = await SubmissionYear.update(query)
        //     .set({
        //         active: false
        //     })
        //     .fetch();

        sails.log('sy', sy) //debugging

        //send code 200
        return res.status(200).json({ 'status': true, 'result': sy });

    }


};

