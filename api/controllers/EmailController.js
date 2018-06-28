/**
 * EmailController
 *
 * @description :: Server-side logic for managing emails
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

    // create: async function (req, res) {

    //     sails.log('email create')

    //     const email = req.body
    //     sails.hooks.email.send(
    //         "resetPassword",
    //         {
    //             Name: email.name,
    //         },
    //         {
    //             to: email.to,
    //             subject: "THFF: Reset Password Email"
    //         },
    //         function (err) {
    //             console.log(err || "Mail Sent!");
    //         }
    //     )
    // },

    sendResetEmail: async function (req, res) {

        sails.log("sendResetEmail")

        const email = req.body;

        sails.log(req.body);
        sails.log("email.name = " + email.name);
        sails.log("email.resetCode = " + email.resetCode);

        var resetURL = '';

        sails.log(sails.config.environment);

        if (sails.config.environment === 'production') {
            resetURL = 'http://www.hagen.foundation'
        }
        else {
            resetURL = 'http://localhost:4200'
        }

        sails.log(resetURL)

        await sails.helpers.sendTemplateEmail.with({
            to: email.to,
            subject: "THFF: Reset Password Email",
            template: 'email-reset-password',
            templateData: {
                Name: email.name,
                resetCode: email.resetCode,
                resetURL: resetURL + '/type-new-password/' + email.name + '/' + email.resetCode
            },
            layout: false
        });

        return res.status(200).json(
            { message: 'Mail Sent!' })

    } //sendResetEmail

    ,
    sendResetEmailConfirmation: async function (req, res) {

        sails.log("sendResetEmailConfirmation")

        sails.log(req.body);
        const email = req.body;

        await sails.helpers.sendTemplateEmail.with({
            to: email.to,
            subject: "Your THFF Password has Changed",
            template: 'email-reset-password-confirmm',
            templateData: {
                Name: email.name,
                //To: email.to
                // fullName: inputs.fullName,
                // token: newUserRecord.emailProofToken
            },
            layout: false
        });

        return res.status(200).json(
            { message: 'Mail Sent!' })

    }
    ,
    sendUserNameEmail: async function (req, res) {

        sails.log("sendUserNameEmail")

        sails.log(req.body);
        const email = req.body;

        await sails.helpers.sendTemplateEmail.with({
            to: email.to,
            subject: "Your THFF Username",
            template: 'email-username',
            templateData: {
                Name: email.name,
                //To: email.to
                // fullName: inputs.fullName,
                // token: newUserRecord.emailProofToken
            },
            layout: false
        });

        return res.status(200).json(
            { message: 'Mail Sent!' })

    },

    sendRegisterUserEmail: async function (req, res) {

        sails.log("sendRegisterUserEmail")

        sails.log(req.body);
        const email = req.body;

        // Send "confirm account" email
        await sails.helpers.sendTemplateEmail.with({
            to: email.to,
            subject: 'Thank You For Registering A User Account', //Please confirm your account
            template: 'email-register-user',
            templateData: {
                Name: email.name,
                //To: email.to
                // fullName: inputs.fullName,
                // token: newUserRecord.emailProofToken
            },
            layout: false
        });

        return res.status(200).json(
            { message: 'Mail Sent!' })

    },
    sendRegisterOrgEmail: async function (req, res) {

        sails.log("sendRegisterOrgEmail")

        sails.log(req.body);
        const email = req.body;

        // Send "confirm account" email
        await sails.helpers.sendTemplateEmail.with({
            to: email.to,
            subject: "Thank You For Registering An Org Account",
            template: 'email-register-org',
            templateData: {
                Name: email.name, //username that registered the org
                OrgName: email.orgName
            },
            layout: false
        });

        return res.status(200).json(
            { message: 'Mail Sent!' })

    }

};

