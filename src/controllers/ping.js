import Logger from '../utils/logger.js'

const PingService = {

  ping: async (req, res) => {

    const { token } = req.body;

    Logger.info(`Ping - ${token}`);

    //validate the token


    return res.status(200).json({ data: 'OK' });
  }

}

export default PingService
