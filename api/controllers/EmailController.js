/**
 * EmailController
 *
 * @description :: Server-side logic for managing emails
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
    create: function (req, res) {

        sails.log('email create')

        const email = req.body
        sails.hooks.email.send(
            "resetPassword",
            {
                Name: email.name,
            },
            {
                to: email.to,
                subject: "THFF: Reset Password Email"
            },
            function (err) {
                console.log(err || "Mail Sent!");
            }
        )
    },

    sendResetEmail: function (req, res) {

        sails.log("sendResetEmail")

        const email = req.body;

        sails.log(req.body);

        var resetURL = '';


        if (sails.config.environment === 'production') {
            resetURL = 'https://hagenfoundationbackend.herokuapp.com'
        }
        else {
            resetURL = 'http://localhost:1337'
        }

        sails.log(resetURL)

        sails.hooks.email.send(
            "resetPassword",
            {
                Name: email.name,
                resetCode: 50,
                resetURL: resetURL + '/50'

            },
            {
                to: email.to,
                subject: "THFF: Reset Password Email"
            },
            function (err) {
                console.log(err || "Mail Sent!");
            }
        )



        //res.send(200);
    }
};

