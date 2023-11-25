import Logger from '../utils/logger.js'
import mongoose from '../config/mongoose.js'

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

}

export default HealthService
