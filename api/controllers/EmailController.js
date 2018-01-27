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
            "sendEmail",
            {
                Name: email.name,
            },
            {
                to: email.to,
                subject: "Welcome Email"
            },
            function (err) {
                console.log(err || "Mail Sent!");
            }
        )
    }
};

