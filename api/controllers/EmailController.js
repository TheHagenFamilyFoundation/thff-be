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
        sails.log("email.name = " + email.name);
        sails.log("email.resetCode = " + email.resetCode);
        //sails.log("email.resetTime = " + email.resetTime);

        var resetURL = '';


        if (sails.config.environment === 'production') {
            resetURL = 'http://hagen.foundation'
        }
        else {
            resetURL = 'http://localhost:4200'
        }

        sails.log(resetURL)

        sails.hooks.email.send(
            "resetPassword",
            {
                Name: email.name,
                resetCode: email.resetCode,
                resetURL: resetURL + '/type-new-password/' + email.name + '/' + email.resetCode

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

