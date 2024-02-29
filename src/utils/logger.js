import { createLogger, format, transports } from 'winston';

import Config from '../config/config.js';

console.log(`Logger Level set to ${process.env.LOG_LEVEL}`);

/*
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
*/

const Logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
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
