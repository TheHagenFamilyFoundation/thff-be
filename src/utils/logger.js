import { createLogger, format, transports } from 'winston';

import Config from '../config/config';

const Logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: Config.appName },
  transports: [
    new transports.Console()
  ]
});

export default Logger;
