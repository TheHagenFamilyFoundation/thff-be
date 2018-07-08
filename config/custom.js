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

  console.log('on prod')

}

module.exports.custom = {

  /***************************************************************************
  *                                                                          *
  * Any other custom config this Sails app should use during development.    *
  *                                                                          *
  ***************************************************************************/

  mailgunDomain: (locals.mailgun_user ? locals.mailgun_user : process.env.MAILGUN_USER),
  mailgunSecret: (locals.mailgun_password ? locals.mailgun_password : process.env.MAILGUN_PASSWORD),
  internalEmailAddress: 'support@example.com',

  fromEmailAddress: 'noreply@example.com',
  fromName: 'THFF',

  s3_key: (locals.s3_key ? locals.s3_key : process.env.S3_KEY),
  s3_secret: (locals.s3_secret ? locals.s3_secret : process.env.S3_SECRET),
  s3_bucket_name: (locals.s3_bucket_name ? locals.s3_bucket_name : process.env.S3_BUCKET_NAME),

};
