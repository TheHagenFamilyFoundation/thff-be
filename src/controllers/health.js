import Logger from '../utils/logger.js'
import mongoose from '../config/mongoose.js'
import Config from '../config/config.js';
import { getRealtimeStatus } from '../socket/index.js';

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

    return res.status(200).json({ dbStatus, version, realtime: getRealtimeStatus() });
  },

  realtime: async (req, res) => {
    Logger.info('Realtime status');

    const realtime = getRealtimeStatus();
    // Socket server not initialized is the only hard failure; a Redis outage
    // degrades to the in-memory adapter and is still reported 200.
    const code = realtime.socket === 'UP' ? 200 : 503;

    return res.status(code).json(realtime);
  },

}

export default HealthService
