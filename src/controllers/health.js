import Logger from '../utils/logger.js'
import mongoose from '../config/mongoose.js'
import Config from '../config/config.js';

const HealthService = {

  health: async (req, res) => {
    Logger.info('Health');
    const dbStatus = mongoose && mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
    const available = dbStatus === 'UP';

    if (!available) {
      return res.status(500).json({ data: 'BAD' });
    }

    return res.status(200).json({ data: 'OK' });
  },

  status: async (req, res) => {
    Logger.info('Status');

    const dbStatus = mongoose && mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
    const version = Config.appVersion;

    return res.status(200).json({ dbStatus, version });
  },

}

export default HealthService
