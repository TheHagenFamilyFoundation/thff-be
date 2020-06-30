/**
 * isAuthorized
 *
 * @description :: Policy to check if user is authorized with JSON web token
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Policies
 */

module.exports = function (req, res, next) {
  let token;

  sails.log.verbose('req.headers', req.headers);

  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2) {
      const scheme = parts[0];
      const credentials = parts[1];

      if (/^Bearer$/i.test(scheme)) {
        token = credentials;
      }
    } else {
      return res.status(401).json({ err: 'Format is Authorization: Bearer [token]' });
    }
  } else if (req.param('token')) {
    token = req.param('token');
    // We delete the token from param to not mess with blueprints
    delete req.query.token;
  } else {
    return res.status(401).json({ err: 'No Authorization header was found' });
  }

  jwToken.verify(token, (err, verifiedToken) => {
    if (err) return res.status(401).json({ err: 'Invalid Token!' });
    req.token = verifiedToken; // This is the decrypted token or the payload you provided
    next();
  });
};
