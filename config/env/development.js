/**
 * Development environment settings
 *
 * This file can include shared settings for a development team,
 * such as API keys or remote database passwords.  If you're using
 * a version control solution for your Sails app, this file will
 * be committed to your repository unless you add it to your .gitignore
 * file.  If your repository will be publicly viewable, don't add
 * any private information to this file!
 *
 */

const locals = require('../local.js');

// console.log(locals);
// console.log(locals.datastores);

module.exports = {

  /** *************************************************************************
   * Set the default database connection for models in the development       *
   * environment (see config/connections.js and config/models.js )           *
   ************************************************************************** */
  appName: 'Hagen Family Foundation Backend',

  datastores: locals.datastores,

  environment: 'development',

  verifyEmailAddresses: true,

  FE_API: process.env.FE_API || 'localhost:4200',
  BE_API: process.env.BE_API || 'localhost:1337',

};
