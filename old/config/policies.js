/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect
 * its actions individually.
 *
 * Any policy file (e.g. `api/policies/authenticated.js`) can be accessed
 * below by its filename, minus the extension, (e.g. "authenticated")
 *
 * For more information on how policies work, see:
 * http://sailsjs.org/#!/documentation/concepts/Policies
 *
 * For more information on configuring policies, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.policies.html
 */

module.exports.policies = {
  /** *************************************************************************
   *                                                                          *
   * Default policy for all controllers and actions (`true` allows public     *
   * access)                                                                  *
   *                                                                          *
   ************************************************************************** */

  // '*': true,

  /** *************************************************************************
   *                                                                          *
   * Here's an example of mapping some policies to run before a controller    *
   * and its actions                                                          *
   *                                                                          *
   ************************************************************************** */
  // RabbitController: {

  // Apply the `false` policy as the default for all of RabbitController's actions
  // (`false` prevents all access, which ensures that nothing bad happens to our rabbits)
  // '*': false,

  // For the action `nurture`, apply the 'isRabbitMother' policy
  // (this overrides `false` above)
  // nurture: 'isRabbitMother',

  // Apply the `isNiceToAnimals` AND `hasRabbitFood` policies
  // before letting any users feed our rabbits
  // feed : ['isNiceToAnimals', 'hasRabbitFood']
  // }

  // '*': ['isAuthorized'], // Everything resctricted here

  UserController: {
    create: true, // We dont need authorization here, allowing public access
    UserNameExists: true, // We dont need authorization here, allowing public access
    EmailExists: true, // We dont need authorization here, allowing public access
    CreateResetCode: true, // We dont need authorization here, allowing public access
    setNewPassword: true, // We dont need authorization here, allowing public access
    ResetCodeCheck: true,
    "*": ["isAuthorized"],
    // changePassword: true,
    // changeEmail: true,
    // find: true,
  },

  /* Debug */
  // 'UserController': {
  //   '*': true // We dont need authorization here, allowing public access
  // },

  AuthController: {
    "*": true, // We dont need authorization here, allowing public access
  },

  // To Display grants on the grants awarded page
  RequestsController: {
    "*": true, // We dont need authorization here, allowing public access
  },

  // debug
  GrantController: {
    "*": true, // We dont need authorization here, allowing public access
  },

  OrganizationController: {
    "*": ["isAuthorized"],
    // "*": true,
  },

  // debug
  OrganizationInfoController: {
    "*": ["isAuthorized"],
    // "*": true,
  },

  Org501c3Controller: {
    "*": ["isAuthorized"],
  },

  // debug
  LOIController: {
    "*": ["isAuthorized"],
  },
  LOIInfoController: {
    "*": ["isAuthorized"],
  },

  FullProposalController: {
    "*": ["isAuthorized"],
  },

  FullProposalItemController: {
    "*": ["isAuthorized"],
  },

  ProposalController: {
    "*": ["isAuthorized"],
    // "*": true,
  },

  // all email routes are ok to access
  EmailController: {
    "*": true, // We dont need authorization here, allowing public access
  },

  VoteController: {
    "*": ["isAuthorized"],
    // "*": true
  },

  VoteloiController: {
    "*": ["isAuthorized"],
    // "*": true
  },

  SubmissionYearController: {
    "*": ["isAuthorized"],
  },

  SettingsController: {
    "*": ["isAuthorized"],
  },
};
