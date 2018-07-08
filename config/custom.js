/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */


try {
  var locals = require('./local.js');
}
catch (e) {

  sails.log('on prod')

}

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

  s3_key: locals.s3_key,
  s3_secret: locals.s3_secret,
  s3_bucket_name: locals.s3_bucket_name

};
