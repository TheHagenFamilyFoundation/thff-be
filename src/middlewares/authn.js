import jwt from 'jsonwebtoken';
import Logger from '../utils/logger.js';

const AuthnMiddleware = {

  authenticateToken: (req, res, next) => {
    let token = req.headers['authorization']; // Express headers are auto converted to lowercase
    if (token) {

      if (token.startsWith('Bearer ')) {
        // Remove Bearer from string
        token = token.slice(7, token.length);
      }

      try {
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
        const { userID } = decoded;

        if (!userID) {
          return res.status(401).send({ code: "TOK003", message: 'Token is not valid' });
        }

        req.decoded = decoded;
        req.token = token;
        next();
      } catch (err) {
        Logger.error(err);
        return res.status(401).send({ code: "TOK003", message: 'Token is not valid' });
      }
    } else {
      Logger.info('Not Authorized. Kicking User Out');
      return res.status(401).send({ code: "TOK004", message: 'Not Authorized' });
    }
  }
}

export default AuthnMiddleware;
