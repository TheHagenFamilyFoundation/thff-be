import mongoose from 'mongoose';

import config from './config.js';
import Logger from '../utils/logger.js';

mongoose.connect(config.databaseURI, {});

const db = mongoose.connection;
db.on('error', () => {
  Logger.error(`Error connecting to MongoDB @ ${config.databaseURI}`);
});

db.once('connecting', () => {
  Logger.info(`Connecting to MongoDB @ ${config.databaseURI}`);
});

db.once('connected', () => {
  Logger.info(`Connected to MongoDB @ ${config.databaseURI}`);
});

export default mongoose;
