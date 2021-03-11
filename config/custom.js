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

  mailgunDomain: (process.env.MAILGUN_USER ? process.env.MAILGUN_USER : locals.mailgun_user),
  mailgunSecret: (process.env.MAILGUN_PASSWORD ? process.env.MAILGUN_PASSWORD : locals.mailgun_password),
  internalEmailAddress: 'support@example.com',

  fromEmailAddress: 'support@hagen.foundation',
  fromName: 'THFF',

  s3_key: (process.env.S3_KEY ? process.env.S3_KEY : locals.s3_key),
  s3_secret: (process.env.S3_SECRET ? process.env.S3_SECRET : locals.s3_secret),
  s3_bucket_name: (process.env.S3_BUCKET_NAME ? process.env.S3_BUCKET_NAME : locals.s3_bucket_name),

  FE_API: (process.env.FE_API) ? process.env.FE_API : 'http://localhost:4200',
  BE_API: (process.env.BE_API) ? process.env.BE_API : 'http://localhost:1337'

};
