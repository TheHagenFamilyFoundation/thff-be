import jwt from 'jsonwebtoken';
import Logger from '../utils/logger.js'

const PingService = {

    ping: async (req, res) => {
        // The auth middleware already validated the token and set req.decoded
        // If we get here, the token is valid
        const { decoded } = req;

        if (!decoded || !decoded.userID) {
            return res.status(401).json({ message: 'Invalid session' });
        }

        // Calculate time remaining on the token
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp ? decoded.exp - now : null;

        Logger.info(`Ping OK - userID: ${decoded.userID}, expires in: ${expiresIn}s`);

        return res.status(200).json({
            status: 'OK',
            userID: decoded.userID,
            expiresIn
        });
    }

}

export default PingService
