/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */

var locals = require('./local.js');

module.exports.custom = {

  /***************************************************************************
  *                                                                          *
  * Any other custom config this Sails app should use during development.    *
  *                                                                          *
  ***************************************************************************/
  mailgunDomain: locals.mailgun_user,
  mailgunSecret: locals.mailgun_password,
  internalEmailAddress: 'support@example.com',

  fromEmailAddress: 'noreply@example.com',
  fromName: 'THFF',


};
