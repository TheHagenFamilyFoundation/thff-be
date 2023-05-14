/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `api/responses/notFound.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#!/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {
  /** *************************************************************************
   *                                                                          *
   * Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, *
   * etc. depending on your default view engine) your home page.              *
   *                                                                          *
   * (Alternatively, remove this and add an `index.html` file in your         *
   * `assets` directory)                                                      *
   *                                                                          *
   ************************************************************************** */

  "/": {
    view: "homepage",
  },
  /** *************************************************************************
   *                                                                          *
   * Custom routes here...                                                    *
   *                                                                          *
   * If a request to a URL doesn't match any of the custom routes above, it   *
   * is matched against Sails route blueprints. See `config/blueprints.js`    *
   * for configuration options and examples.                                  *
   *                                                                          *
   ************************************************************************** */

  "/foo": function (req, res) {
    sails.log("accessing foo");
    return res.send({
      employees: [
        { firstName: "John", lastName: "Doe" },
        { firstName: "Anna", lastName: "Smith" },
        { firstName: "Peter", lastName: "Jones" },
      ],
    });
  }, // end of foo

  "GET /csrfToken": { action: "security/grant-csrf-token" },

  //AUTH
  "GET /authTest": "AuthController.authTest",
  "PUT /auth/login": "AuthController.login",
  "POST /auth/refresh-access-token": "AuthController.refreshAccessToken",
  "POST /auth/forgot-password": "AuthController.forgotPassword",
  "POST /auth/sign-up": "AuthController.signUp",
  "POST /auth/confirm-user": "AuthController.confirmUser",
  // "GET /auth/reset-code-check": "AuthController.resetCodeCheck", //questionable GET removing

  "GET /directors": "UserController.getDirectors",

  "GET /orgUsers/:orgID": "UserController.getOrgUsers",

  "GET /users/count": "UserController.getUserCounts",

  "GET /grants/total": "GrantController.getGrantsTotal",
  "GET /grants/count": "GrantController.getGrantsCount",

  "GET /UserNameExists": "UserController.UserNameExists",
  "GET /EmailExists": "UserController.EmailExists",
  // "GET /reset-code-check": "UserController.ResetCodeCheck",

  // "PUT /CreateResetCode": "UserController.CreateResetCode", //old
  "PUT /auth/reset-password": "UserController.setNewPassword",
  "PUT /changePassword": "UserController.changePassword",
  "PUT /changeEmail": "UserController.changeEmail",
  "PUT /updateName": "UserController.updateName",

  "PUT /validate501c3": "Org501c3Controller.validate501c3",

  "POST /addUser": "OrganizationController.addUser",

  "POST /upload501c3/:orgID": "OrganizationController.upload501c3",

  "GET /get501c3/:orgID": "OrganizationController.get501c3",

  "DELETE /delete501c3/:orgID": "OrganizationController.delete501c3",

  "GET /submitLOI/:loiID": "LOIController.submitLOI",

  "POST /fpItems": "FullProposalItemController.createFPItems",

  "GET /getLOIs": "LOIController.getLOIs",

  "GET /nextLOI": "LOIController.nextLOI",
  "GET /prevLOI": "LOIController.prevLOI",

  "GET /presVotes": "LOIController.presVotes",
  "GET /pendingVotes": "LOIController.pendingVotes",

  "GET /getRankedLOIs": "LOIController.getRankedLOIs",

  /** * EMAILS ** */

  // USER
  "POST /sendRegisterUserEmail": "EmailController.sendRegisterUserEmail",
  "POST /sendRegisterOrgEmail": "EmailController.sendRegisterOrgEmail",
  "POST /sendResetPasswordEmail": "EmailController.sendResetPasswordEmail",
  "POST /sendResetPasswordConfirmationEmail":
    "EmailController.sendResetPasswordConfirmationEmail",
  "POST /sendUserNameEmail": "EmailController.sendUserNameEmail",
  "POST /sendUserEmailChangeEmail": "EmailController.sendUserEmailChangeEmail",
  // 'POST /sendUserEmailChangeEmail': 'EmailController.sendUserEmailChangeEmail',
  // if we need to have users notified when name changes

  "POST /send501c3Status": "EmailController.send501c3Status",

  // DIRECTOR
  "POST /sendValidate501c3": "EmailController.sendValidate501c3",

  "POST /sendViewLOI": "EmailController.sendViewLOI",

  // ORGANIZATION
  // "GET /organization" -- keeping this one with sails
  "GET /organizationCount": "OrganizationController.countOrganizations",

  // ORGANIZATION INFO
  "PATCH /organizationInfo": "OrganizationInfoController.update",

  // PROPOSALS
  "PATCH /proposal": "ProposalController.update",

  // PRESIDENT
  "POST /loiFP": "LOIController.loiFP",
  "POST /openFPs": "LOIController.openFPs",
  "POST /notifyReject": "LOIController.notifyReject",

  // ADMIN
  "GET /getUnSubmittedLOI": "LOIController.getUnSubmittedLOI",

  //SUBMISSION YEARS
  "POST /closeSubmissionYear": "SubmissionYearController.closeSubmissionYear",

  //SETTINGS
  "PUT /settings": "SettingsController.updateSetting",
};
