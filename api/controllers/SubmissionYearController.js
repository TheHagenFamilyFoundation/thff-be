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

        sails.log('openFullProposalPortal')

        // let currentYear = today.getFullYear();

        // let query = {
        //     year: currentYear
        // }

        let query = {
            id: data.id
        }


        var sy = await SubmissionYear.update(query)
            .set({
                fpPoral: true
            })
            .fetch();

        let result = true;

        return result;

    },

    // //connected with LOI Controller
    // closeFullProposalPortal: async function () {
    //     sails.log('closeFullProposalPortal')

    //     let currentYear = today.getFullYear();

    //     let query = {
    //         year: currentYear
    //     }

    //     var sy = await SubmissionYear.update(query)
    //         .set({
    //             fpPoral: false
    //         })
    //         .fetch();

    //     let result = true;

    //     return result;

    // }


};

