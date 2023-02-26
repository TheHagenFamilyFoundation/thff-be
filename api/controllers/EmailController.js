/**
 * EmailController
 *
 * @description :: Server-side logic for managing emails
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  /* EXAMPLE */
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

  async sendResetPasswordEmail(req, res) {
    sails.log("sendResetPasswordEmail");
    sails.log(req.body);

    const email = req.body;

    const query = { email: email.to };
    sails.log.debug("query", query);

    // look up user
    const user = await User.findOne(query);

    sails.log("user", user);

    // sails.log(`email.name = ${email.name}`);
    sails.log(`email.resetCode = ${email.resetCode}`);

    let resetURL = "";

    sails.log(sails.config.environment);

    if (sails.config.environment === "production") {
      resetURL = process.env.FE_API;
    } else {
      resetURL = "http://localhost:4200";
    }

    sails.log(resetURL);
    sails.log("user.email", user.email);

    await sails.helpers.sendTemplateEmail.with({
      to: user.email,
      subject: "THFF: Reset Password Email",
      template: "email-reset-password",
      templateData: {
        Name: user.username,
        resetCode: user.resetCode,
        resetURL: `${resetURL}/pages/auth/type-new-password/${user.resetCode}`,
      },
      layout: false,
    });

    return res.status(200).json({ message: "Mail Sent!" });
  }, // sendResetEmail

  async sendResetPasswordConfirmationEmail(req, res) {
    sails.log("sendResetPasswordConfirmationEmail");

    sails.log(req.body);
    const email = req.body;

    await sails.helpers.sendTemplateEmail.with({
      to: email.to,
      subject: "Your THFF Password has Changed",
      template: "email-reset-password-confirm",
      templateData: {
        Name: email.name,
        // To: email.to
        // fullName: inputs.fullName,
        // token: newUserRecord.emailProofToken
      },
      layout: false,
    });

    return res.status(200).json({ message: "Mail Sent!" });
  },
  async sendUserNameEmail(req, res) {
    sails.log("sendUserNameEmail");

    sails.log(req.body);
    const email = req.body;

    await sails.helpers.sendTemplateEmail.with({
      to: email.to,
      subject: "Your THFF Username",
      template: "email-username",
      templateData: {
        Name: email.name,
        To: email.to,
        // fullName: inputs.fullName,
        // token: newUserRecord.emailProofToken
      },
      layout: false,
    });

    return res.status(200).json({ message: "Mail Sent!" });
  },

  async sendRegisterUserEmail(req, res) {
    sails.log("sendRegisterUserEmail");

    sails.log(req.body);
    const email = req.body;

    // Send "confirm account" email
    await sails.helpers.sendTemplateEmail.with({
      to: email.to,
      subject: "Thank You For Registering A User Account", // Please confirm your account
      template: "email-register-user",
      templateData: {
        Name: email.name,
        // To: email.to
        // fullName: inputs.fullName,
        // token: newUserRecord.emailProofToken
      },
      layout: false,
    });

    return res.status(200).json({ message: "Mail Sent!" });
  },
  async sendRegisterOrgEmail(req, res) {
    sails.log("sendRegisterOrgEmail");

    sails.log(req.body);
    const email = req.body;

    // Send "confirm account" email
    await sails.helpers.sendTemplateEmail.with({
      to: email.to,
      subject: "Thank You For Registering An Org Account",
      template: "email-register-org",
      templateData: {
        Name: email.name, // username that registered the org
        OrgName: email.orgName,
      },
      layout: false,
    });

    return res.status(200).json({ message: "Mail Sent!" });
  },
  async sendUserEmailChangeEmail(req, res) {
    sails.log("sendUserEmailChangeEmail");

    sails.log(req.body);
    const email = req.body;

    await sails.helpers.sendTemplateEmail.with({
      to: email.to,
      subject: "Your THFF Email has Changed",
      template: "email-user-email-change",
      templateData: {
        Name: email.name, // username
        OldEmail: email.oldEmail, // old email
        NewEmail: email.newEmail,
      },
      layout: false,
    });

    return res.status(200).json({ message: "Mail Sent!" });
  },
  async send501c3Status(req, res) {
    sails.log("send501c3Status");

    sails.log(req.body);
    const email = req.body;

    await sails.helpers.sendTemplateEmail.with({
      to: email.to,
      subject: "Your Organization 501c3 Validation Status",
      template: "email-user-notify-501c3-status",
      templateData: {
        Name: email.name, // name
        Organization: email.orgName, // organization name
        OrgID: email.orgID,
        Status: email.status,
      },
      layout: false,
    });
    return res.status(200).json({ message: "Mail Sent!" });
  },
  async sendValidate501c3(req, res) {
    sails.log("sendValidate501c3");

    sails.log(req.body);
    const email = req.body;

    await sails.helpers.sendTemplateEmail.with({
      to: email.to, // directors email
      subject: "Validate 501c3",
      template: "email-director-validate-501c3",
      templateData: {
        Name: email.name, // username
        Director: email.director,
        Organization: email.orgName, // organization Name
        OrgID: email.orgID,
      },
      layout: false,
    });

    return res.status(200).json({ message: "Mail Sent!" });
  },
  async sendViewLOI(req, res) {
    sails.log("sendViewLOI", req.body);

    sails.log(req.body);
    const email = req.body;

    await sails.helpers.sendTemplateEmail.with({
      to: email.to, // directors email
      subject: "New Letter of Intent Submitted",
      template: "email-director-view-loi",
      templateData: {
        Name: email.name, // username
        Director: email.director,
        Organization: email.orgName, // organization Name
        OrgID: email.orgID,
      },
      layout: false,
    });

    return res.status(200).json({ message: "Mail Sent!" });
  },
  // called from LOI controller
  async sendSubmitLOI(body) {
    sails.log("sendSubmitLOI");

    sails.log(body);
    const email = body;

    await sails.helpers.sendTemplateEmail.with({
      to: email.user.email, // user who created the loi
      subject: "Thank You For Submitting A Letter of Intent",
      template: "email-user-loi-submit",
      templateData: {
        Name: email.user.username, // username
        LOIName: email.loi.name,
      },
      layout: false,
    });

    // return res.status(200).json(
    //     { message: 'Mail Sent!' })
  },

  // called from Proposal controller
  async sendSubmittingProposal(body) {
    sails.log("sendSubmittingProposal");

    sails.log(body);
    const proposal = body;

    //query organization users
    let organization = await Organization.findOne({
      id: proposal.organization,
    }).populate("users");
    //email them separately

    sails.log.debug("emailcontroller - organization", organization);

    let promises = [];
    organization.users.forEach((user) => {
      promises.push(
        sails.helpers.sendTemplateEmail.with({
          to: user.email, // organization users
          subject: "Thank You For Submitting A Proposal",
          template: "email-user-proposal-submit",
          templateData: {
            Name: user.email, // email
            ProjectTitle: proposal.projectTitle,
          },
          layout: false,
        })
      );
    });

    try {
      await Promise.all(promises);

      // return res.status(200).json({ message: "Mail Sent!" });
    } catch (e) {
      sails.log.error("Emails not sent");
      // return res.status(500).json({ message: "EMails Not Sent!" });
    }
  },
};
